<?php

namespace App\Http\Controllers\Api;

use App\Models\Language;
use App\Models\FoodType;
use Illuminate\Http\JsonResponse;

class LanguageController
{
    /**
     * Get all languages
     */
    public function index(): JsonResponse
    {
        $languages = Language::all(['code', 'name', 'native_name', 'flag']);
        return response()->json(['languages' => $languages]);
    }

    /**
     * Get all food types
     */
    public function getFoodTypes(): JsonResponse
    {
        $foodTypes = FoodType::all();
        return response()->json(['food_types' => $foodTypes]);
    }

    /**
     * Get food types for specific language
     */
    public function getFoodTypesByLanguage(string $languageCode): JsonResponse
    {
        $foodTypes = FoodType::all();
        
        $formatted = $foodTypes->map(function ($type) use ($languageCode) {
            return [
                'id' => $type->id,
                'slug' => $type->slug,
                'name' => $type->translations[$languageCode] ?? $type->translations['en'] ?? $type->slug,
            ];
        });

        return response()->json(['food_types' => $formatted]);
    }
}
