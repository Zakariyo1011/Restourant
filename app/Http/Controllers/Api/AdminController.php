<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AdminController extends Controller
{
    private const COUNTRY_CITY_PRESETS = [
        'USA' => ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'Dallas', 'San Diego', 'San Jose', 'San Antonio'],
        'Saudi Arabia' => ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Tabuk', 'Buraidah', 'Hail', 'Najran'],
        'UAE' => ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain', 'Umm Al Quwain'],
        'Malaysia' => ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Ipoh', 'Shah Alam', 'Malacca City', 'Kota Kinabalu', 'Kuching'],
        'Thailand' => ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Hat Yai', 'Khon Kaen', 'Nakhon Ratchasima', 'Udon Thani'],
        'Vietnam' => ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho', 'Nha Trang', 'Hue', 'Vung Tau'],
        'Turkey' => ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Konya', 'Adana', 'Gaziantep', 'Mersin', 'Kayseri'],
        'Russia' => ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Samara', 'Omsk', 'Ufa', 'Chelyabinsk'],
    ];

    // Barcha restoranlar ro'yxati (paginated)
    public function restaurants(Request $request)
    {
        $perPage = (int) $request->input('per_page', 50);
        $perPage = min(max($perPage, 5), 200);

        $restaurants = Restaurant::with(['owner', 'location'])
            ->withTrashed()
            ->latest()
            ->paginate($perPage);

        return response()->json($restaurants);
    }

    // Restoranni active/inactive qilish
    public function toggleActive(Restaurant $restaurant)
    {
        if ($restaurant->trashed()) {
            return response()->json([
                'message' => 'Arxivlangan restoran holatini o\'zgartirib bo\'lmaydi. Avval tiklang.',
            ], 422);
        }

        $restaurant->update(['is_active' => !$restaurant->is_active]);

        return response()->json([
            'message'   => $restaurant->is_active ? __('messages.activated') : __('messages.deactivated'),
            'restaurant' => $restaurant,
        ]);
    }

    public function destroy(Restaurant $restaurant)
    {
        $restaurant->delete();

        return response()->json([
            'message' => 'Restoran arxivga olindi.',
        ]);
    }

    public function restore(int $restaurant)
    {
        $item = Restaurant::withTrashed()->findOrFail($restaurant);

        if (! $item->trashed()) {
            return response()->json([
                'message' => 'Restoran allaqachon faol holatda.',
            ], 422);
        }

        $item->restore();

        return response()->json([
            'message' => 'Restoran tiklandi.',
            'restaurant' => $item->fresh(['owner', 'location']),
        ]);
    }

    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:restaurants,id',
            'is_active' => 'required|boolean',
        ]);

        $updated = Restaurant::query()
            ->whereIn('id', $validated['ids'])
            ->whereNull('deleted_at')
            ->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'message' => $validated['is_active']
                ? "{$updated} ta restoran faollashtirildi."
                : "{$updated} ta restoran nofaol qilindi.",
            'updated' => $updated,
        ]);
    }

    // Google Places orqali restoranlarni import qilish (admin panel)
    public function importGooglePlaces(Request $request)
    {
        $request->validate([
            'country'      => 'nullable|string|required_without:countries',
            'countries'    => 'nullable|array|min:1',
            'countries.*'  => 'string',
            'cities'       => 'nullable|array|min:1',
            'cities.*'     => 'string',
            'cuisine'      => 'nullable|string',
            'max'          => 'nullable|integer|min:1|max:2000',
            'max_per_country' => 'nullable|integer|min:1|max:500',
            'auto_cities'  => 'nullable|boolean',
            'user_id'      => 'nullable|integer',
        ]);

        $apiKey = config('services.google.places_api_key') ?? env('GOOGLE_PLACES_API_KEY');
        if (! $apiKey) {
            return response()->json(['message' => 'GOOGLE_PLACES_API_KEY sozlanmagan'], 500);
        }

        $country   = $request->input('country');
        $cities    = $request->input('cities', []);
        $countries = $request->input('countries', []);
        $cuisine   = $request->input('cuisine', '');
        $maxTotal  = (int) $request->input('max', 60);
        $maxPerCountry = (int) $request->input('max_per_country', 0);
        $autoCities = (bool) $request->boolean('auto_cities', true);
        $userId    = (int) $request->input('user_id', 1);

        $created = 0;
        $updated = 0;
        $errors  = [];
        $targets = $this->resolveImportTargets($country, $countries, $cities, $autoCities);

        if (empty($targets)) {
            return response()->json([
                'message' => 'Import uchun davlat/shahar topilmadi',
                'created' => 0,
                'updated' => 0,
                'errors' => ['Country/cities payload noto‘g‘ri yoki bo‘sh.'],
            ], 422);
        }

        $perCountryLimit = $maxPerCountry > 0
            ? $maxPerCountry
            : max(1, (int) ceil($maxTotal / count($targets)));

        foreach ($targets as $targetCountry => $targetCities) {
            $perCity = max(1, (int) ceil($perCountryLimit / max(count($targetCities), 1)));

            foreach ($targetCities as $city) {
                $placeIds = $this->collectPlaceIds($apiKey, $targetCountry, $city, $cuisine, $perCity, $errors);

                $detailsFields = 'place_id,name,formatted_address,formatted_phone_number,website,geometry,opening_hours,rating,types,photos';

                foreach ($placeIds as $placeId) {
                    usleep(150000);

                    $detailRes = Http::get('https://maps.googleapis.com/maps/api/place/details/json', [
                        'place_id' => $placeId,
                        'fields'   => $detailsFields,
                        'key'      => $apiKey,
                    ]);

                    if (! $detailRes->successful()) {
                        $errors[] = "Details failed for {$placeId}: HTTP " . $detailRes->status();
                        continue;
                    }

                    $place = $detailRes->json()['result'] ?? null;
                    if (! $place) continue;

                    $name    = $place['name'] ?? null;
                    $address = $place['formatted_address'] ?? null;
                    $phone   = $place['formatted_phone_number'] ?? null;
                    $website = $place['website'] ?? null;
                    $latP    = $place['geometry']['location']['lat'] ?? null;
                    $lngP    = $place['geometry']['location']['lng'] ?? null;
                    $rating  = $place['rating'] ?? null;
                    $types   = $place['types'] ?? [];
                    $opening = $place['opening_hours']['weekday_text'] ?? null;

                    $descParts = [];
                    if ($rating)    $descParts[] = 'Rating: ' . $rating;
                    if ($types)     $descParts[] = 'Types: ' . implode(', ', $types);
                    if ($opening)   $descParts[] = 'Hours: ' . implode(' | ', (array) $opening);
                    if ($website)   $descParts[] = 'Website: ' . $website;

                    $attrs = [
                        'user_id'         => $userId,
                        'name'            => $name,
                        'phone'           => $phone,
                        'website'         => $website,
                        'is_active'       => true,
                        'country'         => $targetCountry,
                        'city'            => $city,
                        'cuisine_type'    => $cuisine ?: null,
                        'description'     => implode(' / ', $descParts),
                        'google_place_id' => $placeId,
                    ];

                    $existing = Restaurant::where('google_place_id', $placeId)->first();
                    if (! $existing && $name) {
                        $existing = Restaurant::where('name', $name)
                            ->whereHas('location', fn($q) => $q->where('latitude', $latP)->where('longitude', $lngP))
                            ->first();
                    }

                    if ($existing) {
                        $existing->update($attrs);
                        $restaurant = $existing;
                        $updated++;
                    } else {
                        $restaurant = Restaurant::create($attrs);
                        $created++;
                    }

                    if ($latP && $lngP) {
                        $restaurant->location()->updateOrCreate(
                            ['restaurant_id' => $restaurant->id],
                            ['latitude' => $latP, 'longitude' => $lngP, 'address' => $address]
                        );
                    }

                    foreach (array_slice($place['photos'] ?? [], 0, 3) as $photo) {
                        $ref = $photo['photo_reference'] ?? null;
                        if (! $ref) continue;
                        $photoUrl = "https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photoreference={$ref}&key={$apiKey}";
                        if (! $restaurant->images()->where('url', $photoUrl)->exists()) {
                            $restaurant->images()->create(['url' => $photoUrl]);
                        }
                    }
                }
            }
        }

        return response()->json([
            'message' => "Import yakunlandi. Yaratildi: {$created}, Yangilandi: {$updated}",
            'created' => $created,
            'updated' => $updated,
            'errors'  => $errors,
        ]);
    }

    private function resolveImportTargets(?string $country, array $countries, array $cities, bool $autoCities): array
    {
        $targets = [];

        if (!empty($countries)) {
            foreach ($countries as $rawCountry) {
                $normalized = $this->normalizeCountryName((string) $rawCountry);
                $presetCities = self::COUNTRY_CITY_PRESETS[$normalized] ?? [];
                if (!empty($presetCities)) {
                    $targets[$normalized] = $presetCities;
                }
            }
        }

        if (!empty($country)) {
            $normalized = $this->normalizeCountryName($country);
            if (!empty($cities)) {
                $targets[$normalized] = array_values(array_unique(array_filter(array_map('trim', $cities))));
            } elseif ($autoCities) {
                $presetCities = self::COUNTRY_CITY_PRESETS[$normalized] ?? [];
                if (!empty($presetCities)) {
                    $targets[$normalized] = $presetCities;
                }
            }
        }

        return array_filter($targets, fn ($value) => is_array($value) && !empty($value));
    }

    private function normalizeCountryName(string $country): string
    {
        $normalized = mb_strtolower(trim($country));

        return match ($normalized) {
            'us', 'usa', 'america', 'united states', 'united states of america', 'amerika' => 'USA',
            'saudi', 'saudi arabia', 'saudia arabiston', 'saudi arabiston', 'ksa' => 'Saudi Arabia',
            'uae', 'united arab emirates', 'birlashgan arab amirliklari' => 'UAE',
            'malay', 'malaysia' => 'Malaysia',
            'thai', 'thailand' => 'Thailand',
            'vietnam', 'viet nam' => 'Vietnam',
            'turkey', 'turkiye', 'turkiya' => 'Turkey',
            'russia', 'rossiya', 'rosia' => 'Russia',
            default => trim($country),
        };
    }

    private function collectPlaceIds(string $apiKey, string $country, string $city, string $cuisine, int $targetCount, array &$errors): array
    {
        $queryVariants = array_values(array_unique(array_filter([
            trim("restaurant {$cuisine} {$city} {$country}"),
            trim("{$cuisine} restaurant {$city} {$country}"),
            trim("restaurant {$city} {$country}"),
        ])));

        $placeIds = [];

        foreach ($queryVariants as $query) {
            $nextToken = null;

            do {
                $params = ['query' => $query, 'type' => 'restaurant', 'key' => $apiKey];
                if ($nextToken) {
                    $params = ['pagetoken' => $nextToken, 'key' => $apiKey];
                    sleep(2);
                }

                $res = Http::get('https://maps.googleapis.com/maps/api/place/textsearch/json', $params);
                if (! $res->successful()) {
                    $errors[] = "Text Search failed for {$city}, {$country}: HTTP " . $res->status();
                    break;
                }

                $json = $res->json();
                if (($json['status'] ?? '') === 'REQUEST_DENIED') {
                    $errors[] = 'Google API: ' . ($json['error_message'] ?? 'REQUEST_DENIED');
                    break 2;
                }

                foreach ($json['results'] ?? [] as $item) {
                    $placeId = $item['place_id'] ?? null;
                    if (!$placeId) {
                        continue;
                    }
                    if (!in_array($placeId, $placeIds, true)) {
                        $placeIds[] = $placeId;
                        if (count($placeIds) >= $targetCount) {
                            break 2;
                        }
                    }
                }

                $nextToken = $json['next_page_token'] ?? null;
            } while ($nextToken);

            if (count($placeIds) >= $targetCount) {
                break;
            }
        }

        return $placeIds;
    }
}