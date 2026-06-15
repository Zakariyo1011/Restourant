<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Restaurant;

class ImportGooglePlaces extends Command
{
    protected $signature = 'google:import
        {--center=41.311081,69.240562 : Center lat,lng}
        {--radius=1500 : Radius in meters}
        {--max=100 : Maximum number of places to import}
        {--user_id=1 : User id to associate imported restaurants}
        {--dry-run : Do not write to DB}
        {--download-photos=false : If true, attempt to download photos (can be slow)}';

    protected $description = 'Import restaurants from Google Places (Nearby Search + Place Details)';

    public function handle()
    {
        $center = $this->option('center');
        [$lat, $lng] = explode(',', $center) + [null, null];
        if (! $lat || ! $lng) {
            $this->error('Invalid --center. Use lat,lng');
            return 1;
        }

        $radius = intval($this->option('radius')) ?: 1500;
        $max = intval($this->option('max')) ?: 100;
        $userId = intval($this->option('user_id')) ?: 1;
        $dryRun = (bool) $this->option('dry-run');
        $downloadPhotos = filter_var($this->option('download-photos'), FILTER_VALIDATE_BOOLEAN);

        $apiKey = config('services.google.places_api_key') ?? env('GOOGLE_PLACES_API_KEY');
        if (! $apiKey) {
            $this->error('Set GOOGLE_PLACES_API_KEY in .env or services.php');
            return 1;
        }

        $this->info("Starting import from center {$lat},{$lng} radius {$radius}m (max {$max})");

        $placeIds = [];
        $nextPageToken = null;
        $collected = 0;

        // Nearby search loop (collect place_ids)
        $firstUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={$lat},{$lng}&radius={$radius}&type=restaurant&key={$apiKey}";
        $url = $firstUrl;

        while ($collected < $max) {
            $this->info('Requesting: '.$url);
            $res = Http::get($url);
            if (! $res->successful()) {
                $this->error('Nearby search failed: '.$res->status());
                break;
            }
            $json = $res->json();
            $results = $json['results'] ?? [];
            foreach ($results as $r) {
                if (isset($r['place_id']) && ! in_array($r['place_id'], $placeIds)) {
                    $placeIds[] = $r['place_id'];
                    $collected++;
                    if ($collected >= $max) break 2;
                }
            }

            $nextPageToken = $json['next_page_token'] ?? null;
            if ($nextPageToken) {
                // next_page_token may take a short time to become valid
                sleep(2);
                $url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken={$nextPageToken}&key={$apiKey}";
                continue;
            }
            break;
        }

        $this->info('Collected '.count($placeIds).' place_ids');

        $detailsFields = implode(',', [
            'place_id','name','formatted_address','formatted_phone_number','website',
            'geometry','opening_hours','rating','types','photos'
        ]);

        $created = 0;
        $updated = 0;

        foreach ($placeIds as $idx => $placeId) {
            $this->info('Fetching details for '.$placeId.' ('.($idx+1).'/'.count($placeIds).')');
            // Respect simple rate limiting
            usleep(200000);
            $detailRes = Http::get('https://maps.googleapis.com/maps/api/place/details/json', [
                'place_id' => $placeId,
                'fields' => $detailsFields,
                'key' => $apiKey,
            ]);

            if (! $detailRes->successful()) {
                $this->error('Place details failed: '.$detailRes->status());
                continue;
            }
            $detailJson = $detailRes->json();
            $place = $detailJson['result'] ?? null;
            if (! $place) continue;

            $name = $place['name'] ?? null;
            $address = $place['formatted_address'] ?? null;
            $phone = $place['formatted_phone_number'] ?? null;
            $website = $place['website'] ?? null;
            $latP = $place['geometry']['location']['lat'] ?? null;
            $lngP = $place['geometry']['location']['lng'] ?? null;
            $rating = $place['rating'] ?? null;
            $opening = $place['opening_hours']['weekday_text'] ?? ($place['opening_hours']['open_now'] ?? null);

            $attrs = [
                'user_id' => $userId,
                'name' => $name,
                'phone' => $phone,
                'website' => $website,
                'is_active' => true,
            ];

            // build description
            $descParts = [];
            if ($rating) $descParts[] = 'Rating: '.$rating;
            if (! empty($place['types'])) $descParts[] = 'Types: '.implode(', ', $place['types']);
            if (! empty($opening)) {
                if (is_array($opening)) $descParts[] = 'Hours: '.implode(' | ', $opening);
                else $descParts[] = 'Hours: '.$opening;
            }
            if ($website) $descParts[] = 'Website: '.$website;
            $attrs['description'] = implode(' / ', $descParts);

            // Upsert by google_place_id
            $existing = Restaurant::where('google_place_id', $placeId)->first();
            if (! $existing) {
                $existing = Restaurant::where('name', $name)
                    ->whereHas('location', function ($q) use ($latP, $lngP) {
                        $q->where('latitude', $latP)->where('longitude', $lngP);
                    })->first();
            }

            if ($dryRun) {
                $this->info('[dry-run] Would import: '.$name.' ('.$placeId.')');
            } else {
                if ($existing) {
                    $existing->update(array_merge($attrs, ['google_place_id' => $placeId]));
                    $restaurant = $existing;
                    $updated++;
                } else {
                    $restaurant = new Restaurant(array_merge($attrs, ['google_place_id' => $placeId]));
                    $restaurant->save();
                    $created++;
                }

                // update or create location
                $restaurant->location()->updateOrCreate(
                    ['restaurant_id' => $restaurant->id],
                    ['latitude' => $latP, 'longitude' => $lngP, 'address' => $address]
                );

                // photos: either download and host locally, or store Google photo URL references
                if (! empty($place['photos']) && is_array($place['photos'])) {
                    foreach (array_slice($place['photos'], 0, 3) as $i => $photo) {
                        $ref = $photo['photo_reference'] ?? null;
                        if (! $ref) continue;
                        $photoUrl = "https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photoreference={$ref}&key={$apiKey}";

                        if ($downloadPhotos) {
                            try {
                                $this->info('Downloading photo for '.$placeId);
                                $imgRes = Http::get($photoUrl);
                                if ($imgRes->successful()) {
                                    $contents = $imgRes->body();
                                    $ext = 'jpg';
                                    $filename = Str::slug($restaurant->name ?: $placeId).'_'.$i.'.'.$ext;
                                    $path = "restaurants/{$restaurant->id}/{$filename}";
                                    Storage::disk('public')->put($path, $contents);
                                    $storedUrl = Storage::url($path);
                                    $existsImage = $restaurant->images()->where('url', $storedUrl)->first();
                                    if (! $existsImage) {
                                        $restaurant->images()->create(['url' => $storedUrl]);
                                    }
                                } else {
                                    $this->warn('Failed to download photo: HTTP '.$imgRes->status());
                                }
                            } catch (\Exception $e) {
                                $this->warn('Photo download error: '.$e->getMessage());
                            }
                        } else {
                            // create image record with Google-hosted URL reference
                            $existsImage = $restaurant->images()->where('url', $photoUrl)->first();
                            if (! $existsImage) {
                                $restaurant->images()->create(['url' => $photoUrl]);
                            }
                        }
                    }
                }
            }
        }

        $this->info("Done. Created: {$created}, Updated: {$updated}");
        return 0;
    }
}
