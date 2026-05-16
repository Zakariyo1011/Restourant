<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RestaurantController extends Controller
{
    private function uploadToImageKit($file): ?string
    {
        $privateKey = config('services.imagekit.private_key');
        $publicKey = config('services.imagekit.public_key');
        $urlEndpoint = config('services.imagekit.url_endpoint');

        if (empty($privateKey) || empty($publicKey) || empty($urlEndpoint)) {
            Log::error('ImageKit: credentials yo\'q (Railway/.env da IMAGEKIT_* o\'zgaruvchilarni tekshiring)', [
                'has_private_key' => !empty($privateKey),
                'has_public_key' => !empty($publicKey),
                'has_url_endpoint' => !empty($urlEndpoint),
            ]);
            return null;
        }

        $realPath = $file->getRealPath();
        if (!$realPath || !is_readable($realPath)) {
            Log::error('ImageKit: faylni o\'qib bo\'lmadi');
            return null;
        }

        $fileContents = file_get_contents($realPath);
        if ($fileContents === false) {
            Log::error('ImageKit: fayl kontenti bo\'sh');
            return null;
        }

        $fileName = time() . '_' . preg_replace(
            '/[^a-zA-Z0-9._-]/',
            '_',
            $file->getClientOriginalName()
        );

        $ch = curl_init('https://upload.imagekit.io/api/v1/files/upload');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD => $privateKey . ':',
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
            CURLOPT_POSTFIELDS => [
                'file' => base64_encode($fileContents),
                'fileName' => $fileName,
                'folder' => '/restaurants',
                'useUniqueFileName' => 'true',
            ],
            CURLOPT_TIMEOUT => 60,
            CURLOPT_CONNECTTIMEOUT => 15,
        ]);

        $responseBody = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($responseBody === false) {
            Log::error('ImageKit cURL xatosi: ' . $curlError);
            return null;
        }

        $data = json_decode($responseBody, true);
        Log::info('ImageKit upload javobi', [
            'http_code' => $httpCode,
            'file_name' => $fileName,
            'response' => $data,
        ]);

        if ($httpCode >= 200 && $httpCode < 300 && !empty($data['url'])) {
            return $data['url'];
        }

        $errorMessage = is_array($data)
            ? ($data['message'] ?? $data['error'] ?? json_encode($data))
            : $responseBody;

        Log::error('ImageKit yuklash muvaffaqiyatsiz', [
            'http_code' => $httpCode,
            'error' => $errorMessage,
        ]);

        return null;
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