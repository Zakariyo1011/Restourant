<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RestaurantController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\TelegramWebhookController;

// Test
Route::get('/test', function () {
    return response()->json(['message' => __('messages.api_ok')]);
});

Route::get('/meta/locales', function () {
    return response()->json([
        'locales' => [
            ['code' => 'en', 'name' => 'English', 'flag' => '🇬🇧'],
            ['code' => 'ru', 'name' => 'Русский', 'flag' => '🇷🇺'],
            ['code' => 'uz', 'name' => "O'zbek", 'flag' => '🇺🇿'],
            ['code' => 'kk', 'name' => 'Қазақша', 'flag' => '🇰🇿'],
            ['code' => 'ky', 'name' => 'Кыргызча', 'flag' => '🇰🇬'],
            ['code' => 'tg', 'name' => 'Тоҷикӣ', 'flag' => '🇹🇯'],
        ],
        'current' => app()->getLocale(),
    ]);
});

Route::post('/telegram/webhook', TelegramWebhookController::class);

// Google OAuth
Route::get('/auth/google/redirect', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);

// Public restoranlar — nearby AVVAL bo'lishi sha
Route::get('/restaurants/nearby', function (Illuminate\Http\Request $request) {
    $validated = validator($request->all(), [
        'lat' => 'required|numeric|between:-90,90',
        'lng' => 'required|numeric|between:-180,180',
        'radius' => 'nullable|numeric|min:0.1|max:200',
        'limit' => 'nullable|integer|min:1|max:20',
    ])->validate();

    $lat = (float) $validated['lat'];
    $lng = (float) $validated['lng'];
    $radius = isset($validated['radius']) ? (float) $validated['radius'] : 50.0;
    $limit = isset($validated['limit']) ? (int) $validated['limit'] : 5;

    $restaurants = \App\Models\Restaurant::query()
        ->with('location')
        ->where('is_active', true)
        ->whereHas('location')
        ->get()
        ->map(function ($restaurant) use ($lat, $lng) {
            $R = 6371;
            $dLat = deg2rad($restaurant->location->latitude - $lat);
            $dLon = deg2rad($restaurant->location->longitude - $lng);
            $a = sin($dLat/2) * sin($dLat/2) +
                 cos(deg2rad($lat)) * cos(deg2rad($restaurant->location->latitude)) *
                 sin($dLon/2) * sin($dLon/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = round($R * $c, 1);

            return [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'address' => $restaurant->location?->address,
                'phone' => $restaurant->phone,
                'city' => $restaurant->city,
                'cuisine_type' => $restaurant->cuisine_type,
                'price_range' => $restaurant->price_range,
                'distance' => $distance,
                'location' => [
                    'latitude' => (float) $restaurant->location->latitude,
                    'longitude' => (float) $restaurant->location->longitude,
                    'address' => $restaurant->location?->address,
                ],
            ];
        })
        ->filter(fn($r) => $r['distance'] <= $radius)
        ->sortBy('distance')
        ->take($limit)
        ->values();

    return response()->json([
        'data' => $restaurants,
        'meta' => [
            'lat' => $lat,
            'lng' => $lng,
            'radius' => $radius,
            'limit' => $limit,
            'count' => $restaurants->count(),
        ],
    ]);
});

Route::get('/restaurants', [RestaurantController::class, 'index']);
Route::get('/restaurants/{id}', [RestaurantController::class, 'show']);

// Statik ma'lumotlar
Route::get('/meta/cuisine-types', function () {
    return response()->json([
        'cuisine_types' => __('cuisines'),
        'price_ranges' => ['$', '$$', '$$$'],
    ]);
});

// Restoran egasi (token kerak)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/my-restaurant', [RestaurantController::class, 'myRestaurant']);
    Route::post('/my-restaurant', [RestaurantController::class, 'store']);
    Route::post('/my-restaurant/update', [RestaurantController::class, 'update']);
    Route::delete('/my-restaurant/images/{image}', [RestaurantController::class, 'deleteImage']);
    Route::delete('/my-restaurant', [RestaurantController::class, 'destroy']);
    Route::post('/me/locale', [AuthController::class, 'updateLocale']);
    Route::post('/send-arija', [RestaurantController::class, 'sendArija']);
});

// Admin (token + admin role kerak)
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/admin/restaurants', [AdminController::class, 'restaurants']);
    Route::patch('/admin/restaurants/{restaurant}/toggle', [AdminController::class, 'toggleActive']);
    Route::post('/admin/import-google-places', [AdminController::class, 'importGooglePlaces']);
});