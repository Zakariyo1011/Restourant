<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\Location;
use Illuminate\Http\Request;
use ImageKit\ImageKit;
use Illuminate\Support\Facades\Log;

class RestaurantController extends Controller
{
    private function uploadToImageKit($file)
    {
        try {
            $imageKit = new ImageKit(
                env('IMAGEKIT_PUBLIC_KEY'),
                env('IMAGEKIT_PRIVATE_KEY'),
                env('IMAGEKIT_URL_ENDPOINT')
            );

            $result = $imageKit->uploadFile([
                'file'     => base64_encode(file_get_contents($file->getRealPath())),
                'fileName' => time() . '_' . $file->getClientOriginalName(),
                'folder'   => '/restaurants',
            ]);

            // ImageKit SDK javobini xavfsiz tekshirish (Obyekt yoki Massiv ko'rinishida)
            if (is_object($result) && isset($result->result->url)) {
                return $result->result->url;
            }
            if (is_array($result) && isset($result['result']['url'])) {
                return $result['result']['url'];
            }
            if (isset($result->url)) {
                return $result->url;
            }

            Log::error('ImageKit URL topilmadi. Olingan natija: ' . json_encode($result));
            return null;

        } catch (\Exception $e) {
            Log::error('ImageKit exception: ' . $e->getMessage());
            return null;
        }
    }

    public function index()
    {
        $restaurants = Restaurant::with('location')
            ->where('is_active', true)
            ->latest()
            ->get();

        return response()->json($restaurants);
    }

    public function show($id)
    {
        $restaurant = Restaurant::with('location')
            ->where('is_active', true)
            ->findOrFail($id);

        return response()->json($restaurant);
    }

    public function myRestaurant(Request $request)
    {
        $restaurant = $request->user()->restaurant()->with('location')->first();

        if (!$restaurant) {
            return response()->json(['message' => 'Restoran topilmadi'], 404);
        }

        return response()->json($restaurant);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'phone'        => 'nullable|string|max:20',
            'image'        => 'nullable|image|max:5120',
            'latitude'     => 'required|numeric',
            'longitude'    => 'required|numeric',
            'address'      => 'nullable|string',
            'cuisine_type' => 'nullable|string|max:100',
            'country'      => 'nullable|string|max:100',
            'city'         => 'nullable|string|max:100',
            'price_range'  => 'nullable|in:$,$$,$$$',
            'website'      => 'nullable|url|max:255',
            'instagram'    => 'nullable|string|max:255',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $this->uploadToImageKit($request->file('image'));
        }

        $restaurant = Restaurant::create([
            'user_id'      => $request->user()->id,
            'name'         => $request->name,
            'description'  => $request->description,
            'phone'        => $request->phone,
            'image_path'   => $imagePath,
            'is_active'    => false,
            'cuisine_type' => $request->cuisine_type,
            'country'      => $request->country,
            'city'         => $request->city,
            'price_range'  => $request->price_range,
            'website'      => $request->website,
            'instagram'    => $request->instagram,
        ]);

        Location::create([
            'restaurant_id' => $restaurant->id,
            'latitude'      => $request->latitude,
            'longitude'     => $request->longitude,
            'address'       => $request->address,
        ]);

        return response()->json($restaurant->load('location'), 201);
    }

    public function update(Request $request)
    {
        $restaurant = $request->user()->restaurant;

        if (!$restaurant) {
            return response()->json(['message' => 'Restoran topilmadi'], 404);
        }

        // Validation yaxshilandi: agar biri kelsa, ikkinchisi ham majburiy bo'ladi
        $request->validate([
            'name'         => 'sometimes|string|max:255',
            'description'  => 'nullable|string',
            'phone'        => 'nullable|string|max:20',
            'image'        => 'nullable|image|max:5120',
            'latitude'     => 'required_with:longitude|numeric',
            'longitude'    => 'required_with:latitude|numeric',
            'address'      => 'nullable|string',
            'cuisine_type' => 'nullable|string|max:100',
            'country'      => 'nullable|string|max:100',
            'city'         => 'nullable|string|max:100',
            'price_range'  => 'nullable|in:$,$$,$$$',
            'website'      => 'nullable|url|max:255',
            'instagram'    => 'nullable|string|max:255',
        ]);

        // 1. Faqat kerakli matnli maydonlarni yangilaymiz (image_path bu ro'yxatdan olib tashlandi)
        $restaurant->fill($request->only([
            'name', 'description', 'phone',
            'cuisine_type', 'country', 'city',
            'price_range', 'website', 'instagram'
        ]));

        // 2. Agar yangi rasm yuklangan bo'lsa, uni alohida yozamiz
        if ($request->hasFile('image')) {
            $newImagePath = $this->uploadToImageKit($request->file('image'));
            if ($newImagePath) {
                $restaurant->image_path = $newImagePath;
            }
        }

        // Ma'lumotlarni bazaga saqlaymiz
        $restaurant->save();

        // Location yangilanishi
        if ($request->has('latitude') && $request->has('longitude')) {
            $restaurant->location()->updateOrCreate(
                ['restaurant_id' => $restaurant->id],
                [
                    'latitude'  => $request->latitude,
                    'longitude' => $request->longitude,
                    'address'   => $request->address,
                ]
            );
        }

        return response()->json($restaurant->load('location'));
    }

    public function destroy(Request $request)
    {
        $restaurant = $request->user()->restaurant;
        if (!$restaurant) {
            return response()->json(['message' => 'Topilmadi'], 404);
        }
        $restaurant->delete();
        return response()->json(['message' => 'O\'chirildi']);
    }

    public function sendArija(Request $request)
    {
        $request->validate(['phone' => 'required|string']);
        $user = $request->user();
        $restaurant = $user->restaurant;
        Log::info("Yangi ariza: {$user->name}, tel: {$request->phone}, restoran: {$restaurant?->name}");
        return response()->json(['message' => 'Ariza yuborildi']);
    }
}