<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use ImageKit\ImageKit;

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

        Log::info('ImageKit Response: ' . json_encode($result));

        // ImageKit response tekshirish
        if (!$result) {
            Log::error('ImageKit: Null response qaytdi');
            return null;
        }

        // Birinchi usul: Direct URL property
        if (property_exists($result, 'url') && !empty($result->url)) {
            Log::info('ImageKit URL topildi (direct): ' . $result->url);
            return $result->url;
        }

        // Ikkinchi usul: JSON konvertatsiya
        $responseArray = is_object($result) ? json_decode(json_encode($result), true) : $result;
        
        if (is_array($responseArray)) {
            if (!empty($responseArray['url'])) {
                Log::info('ImageKit URL topildi (array): ' . $responseArray['url']);
                return $responseArray['url'];
            }
            
            // Chuqur qidiruv
            if (!empty($responseArray['success']['url'])) {
                Log::info('ImageKit URL topildi (nested): ' . $responseArray['success']['url']);
                return $responseArray['success']['url'];
            }
        }

        Log::error('ImageKit URL topilmadi. Response: ' . json_encode($result));
        return null;

    } catch (\Exception $e) {
        Log::error('ImageKit exception: ' . $e->getMessage() . ' | Stack: ' . $e->getTraceAsString());
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
            Log::info('Store: Rasm yuklanganidan keyin URL - ' . ($imagePath ?? 'NULL'));
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

        Log::info('Store: Restoran yaratildi - ID: ' . $restaurant->id . ', image_path: ' . ($restaurant->image_path ?? 'NULL'));

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

    $request->validate([
        'name'         => 'sometimes|string|max:255',
        'description'  => 'nullable|string',
        'phone'        => 'nullable|string|max:20',
        'image'        => 'nullable|image|max:5120',
        'latitude'     => 'sometimes|numeric',
        'longitude'    => 'sometimes|numeric',
        'address'      => 'nullable|string',
        'cuisine_type' => 'nullable|string|max:100',
        'country'      => 'nullable|string|max:100',
        'city'         => 'nullable|string|max:100',
        'price_range'  => 'nullable|in:$,$$,$$$',
        'website'      => 'nullable|url|max:255',
        'instagram'    => 'nullable|string|max:255',
    ]);

    // Avval maydonlarni yangilaymiz
    $restaurant->fill($request->only([
        'name', 'description', 'phone',
        'cuisine_type', 'country', 'city',
        'price_range', 'website', 'instagram'
    ]));

    // Rasm alohidaaa
    if ($request->hasFile('image')) {
        $url = $this->uploadToImageKit($request->file('image'));
        if ($url) {
            $restaurant->image_path = $url;
            Log::info('Update: Yangi rasm URL - ' . $url);
        } else {
            Log::warning('Update: Rasm yuklash muvaffaqiyatsiz tugadi');
        }
    }

    $restaurant->save();
    Log::info('Update: Restoran saqlandi - ID: ' . $restaurant->id . ', image_path: ' . ($restaurant->image_path ?? 'NULL'));

    if ($request->latitude && $request->longitude) {
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