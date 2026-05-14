<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RestaurantController;
use App\Http\Controllers\Api\AdminController;

// Test
Route::get('/test', function () {
    return response()->json(['message' => 'API ishlayapti!']);
});

// Google OAuth
Route::get('/auth/google/redirect', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);

// Public restoranlar
Route::get('/restaurants', [RestaurantController::class, 'index']);
Route::get('/restaurants/{id}', [RestaurantController::class, 'show']);

// Restoran egasi (token kerak)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/my-restaurant', [RestaurantController::class, 'myRestaurant']);
    Route::post('/my-restaurant', [RestaurantController::class, 'store']);
    Route::post('/my-restaurant/update', [RestaurantController::class, 'update']);
});

// Admin (token + admin role kerak)
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/admin/restaurants', [AdminController::class, 'restaurants']);
    Route::patch('/admin/restaurants/{restaurant}/toggle', [AdminController::class, 'toggleActive']);
});

Route::middleware('auth:sanctum')->group(function () {
    
    Route::delete('/my-restaurant', [RestaurantController::class, 'destroy']);
    Route::post('/send-arija', [RestaurantController::class, 'sendArija']);
});

// Statik ma'lumotlar
Route::get('/meta/cuisine-types', function () {
    return response()->json([
        'cuisine_types' => [
            'uzbek'      => "O'zbek",
            'tajik'      => 'Tojik',
            'kazakh'     => 'Qozoq',
            'kyrgyz'     => 'Qirg\'iz',
            'turkish'    => 'Turk',
            'arabic'     => 'Arab',
            'persian'    => 'Fors',
            'afghan'     => 'Afghan',
            'georgian'   => 'Gruzin',
            'russian'    => 'Rus',
            'european'   => 'Yevropa',
            'asian'      => 'Osiyo',
            'mixed'      => 'Aralash',
        ],
        'price_ranges' => ['$', '$$', '$$$'],
    ]);
});