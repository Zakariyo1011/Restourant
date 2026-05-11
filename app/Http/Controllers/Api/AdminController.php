<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    // Barcha restoranlar ro'yxati
    public function restaurants()
    {
        $restaurants = Restaurant::with(['owner', 'location'])
            ->latest()
            ->get();

        return response()->json($restaurants);
    }

    // Restoranni active/inactive qilish
    public function toggleActive(Restaurant $restaurant)
    {
        $restaurant->update(['is_active' => !$restaurant->is_active]);

        return response()->json([
            'message'   => $restaurant->is_active ? 'Aktivlashtirildi' : 'Deaktivlashtirildi',
            'restaurant' => $restaurant,
        ]);
    }
}