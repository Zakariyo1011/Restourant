<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request)
    {
        $restaurants = $request->user()
            ->favoriteRestaurants()
            ->with(['location', 'images'])
            ->where('is_active', true)
            ->get();

        return response()->json(['data' => $restaurants]);
    }

    public function store(Request $request, Restaurant $restaurant)
    {
        $request->user()->favorites()->firstOrCreate([
            'restaurant_id' => $restaurant->id,
        ]);

        return response()->json(['favorited' => true]);
    }

    public function destroy(Request $request, Restaurant $restaurant)
    {
        $request->user()->favorites()->where('restaurant_id', $restaurant->id)->delete();

        return response()->json(['favorited' => false]);
    }
}
