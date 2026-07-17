<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AdminController extends Controller
{
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
            'country'      => 'required|string',
            'cities'       => 'required|array|min:1',
            'cities.*'     => 'string',
            'cuisine'      => 'nullable|string',
            'max'          => 'nullable|integer|min:1|max:200',
            'user_id'      => 'nullable|integer',
        ]);

        $apiKey = config('services.google.places_api_key') ?? env('GOOGLE_PLACES_API_KEY');
        if (! $apiKey) {
            return response()->json(['message' => 'GOOGLE_PLACES_API_KEY sozlanmagan'], 500);
        }

        $country   = $request->input('country');
        $cities    = $request->input('cities');
        $cuisine   = $request->input('cuisine', '');
        $maxTotal  = (int) $request->input('max', 60);
        $userId    = (int) $request->input('user_id', 1);

        $created = 0;
        $updated = 0;
        $errors  = [];
        $perCity = max(1, (int) ceil($maxTotal / count($cities)));

        foreach ($cities as $city) {
            // Query yasash: "restaurant sushi Tokyo Japan"
            $queryParts = array_filter(['restaurant', $cuisine, $city, $country]);
            $query = implode(' ', $queryParts);

            $placeIds   = [];
            $collected  = 0;
            $nextToken  = null;

            // Text Search: place_id larni yig'ish
            do {
                $params = ['query' => $query, 'type' => 'restaurant', 'key' => $apiKey];
                if ($nextToken) {
                    $params = ['pagetoken' => $nextToken, 'key' => $apiKey];
                    sleep(2);
                }

                $res = Http::get('https://maps.googleapis.com/maps/api/place/textsearch/json', $params);

                if (! $res->successful()) {
                    $errors[] = "Text Search failed for {$city}: HTTP " . $res->status();
                    break;
                }

                $json = $res->json();
                if (($json['status'] ?? '') === 'REQUEST_DENIED') {
                    $errors[] = 'Google API: ' . ($json['error_message'] ?? 'REQUEST_DENIED');
                    break 2;
                }

                foreach ($json['results'] ?? [] as $r) {
                    if (isset($r['place_id']) && ! in_array($r['place_id'], $placeIds)) {
                        $placeIds[] = $r['place_id'];
                        $collected++;
                        if ($collected >= $perCity) break;
                    }
                }

                $nextToken = $json['next_page_token'] ?? null;

            } while ($nextToken && $collected < $perCity);

            // Har bir place_id uchun detail olish va saqlash
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
                    'country'         => $country,
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

                // Location saqlash
                if ($latP && $lngP) {
                    $restaurant->location()->updateOrCreate(
                        ['restaurant_id' => $restaurant->id],
                        ['latitude' => $latP, 'longitude' => $lngP, 'address' => $address]
                    );
                }

                // Rasmlar (Google URL sifatida saqlash)
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

        return response()->json([
            'message' => "Import yakunlandi. Yaratildi: {$created}, Yangilandi: {$updated}",
            'created' => $created,
            'updated' => $updated,
            'errors'  => $errors,
        ]);
    }
}