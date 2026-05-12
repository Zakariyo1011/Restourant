<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class RestaurantController extends Controller
{
    // Barcha active restoranlar (public)
    public function index()
    {
        $restaurants = Restaurant::with('location')
            ->where('is_active', true)
            ->latest()
            ->get();

        return response()->json($restaurants);
    }

    // Bitta restoran (public)
    public function show($id)
    {
        $restaurant = Restaurant::with('location')
            ->where('is_active', true)
            ->findOrFail($id);

        return response()->json($restaurant);
    }

    // Egasining o'z restorani
    public function myRestaurant(Request $request)
    {
        $restaurant = $request->user()->restaurant()->with('location')->first();

        if (!$restaurant) {
            return response()->json(['message' => 'Restoran topilmadi'], 404);
        }

        return response()->json($restaurant);
    }

    // Restoran yaratish
    public function store(Request $request)
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'phone'       => 'nullable|string|max:20',
            'image'       => 'nullable|image|max:2048',
            'latitude'    => 'required|numeric',
            'longitude'   => 'required|numeric',
            'address'     => 'nullable|string',
        ]);

        // Rasm yuklash
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('restaurants', 'public');
        }

        $restaurant = Restaurant::create([
            'user_id'     => $request->user()->id,
            'name'        => $request->name,
            'description' => $request->description,
            'phone'       => $request->phone,
            'image_path'  => $imagePath,
            'is_active'   => false,
        ]);

        // Lokatsiya saqlash
        Location::create([
            'restaurant_id' => $restaurant->id,
            'latitude'      => $request->latitude,
            'longitude'     => $request->longitude,
            'address'       => $request->address,
        ]);

        return response()->json($restaurant->load('location'), 201);
    }

    // Restoran yangilash
    public function update(Request $request)
    {
        $restaurant = $request->user()->restaurant;

        if (!$restaurant) {
            return response()->json(['message' => 'Restoran topilmadi'], 404);
        }

        $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'phone'       => 'nullable|string|max:20',
            'image'       => 'nullable|image|max:2048',
            'latitude'    => 'sometimes|numeric',
            'longitude'   => 'sometimes|numeric',
            'address'     => 'nullable|string',
        ]);

        // Yangi rasm yuklash
        if ($request->hasFile('image')) {
            if ($restaurant->image_path) {
                Storage::disk('public')->delete($restaurant->image_path);
            }
            $restaurant->image_path = $request->file('image')->store('restaurants', 'public');
        }

        $restaurant->update($request->only(['name', 'description', 'phone', 'image_path']));

        // Lokatsiya yangilash
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


    // Restoran o'chirish
public function destroy(Request $request)
{
    $restaurant = $request->user()->restaurant;
    if (!$restaurant) {
        return response()->json(['message' => 'Topilmadi'], 404);
    }
    if ($restaurant->image_path) {
        Storage::disk('public')->delete($restaurant->image_path);
    }
    $restaurant->delete();
    return response()->json(['message' => 'O\'chirildi']);
}

// Arija yuborish (hozircha log, keyinroq Telegram)
public function sendArija(Request $request)
{
    $request->validate(['phone' => 'required|string']);
    $user = $request->user();
    $restaurant = $user->restaurant;

    \Log::info("Yangi ariza: {$user->name}, tel: {$request->phone}, restoran: {$restaurant?->name}");

    return response()->json(['message' => 'Ariza yuborildi']);
}
    
}

