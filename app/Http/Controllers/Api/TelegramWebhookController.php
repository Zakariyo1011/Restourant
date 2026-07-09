<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FoodType;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    private const LANGUAGES = [
        'en' => '🇬🇧 English',
        'ru' => '🇷🇺 Русский',
        'uz' => '🇺🇿 O\'zbek',
        'kk' => '🇰🇿 Қазақша',
        'ky' => '🇰🇬 Кыргызча',
        'tg' => '🇹🇯 Тоҷикӣ',
        'tr' => '🇹🇷 Türkçe',
    ];

    public function __invoke(Request $request)
    {
        $secret = config('services.telegram.webhook_secret');
        if (!empty($secret) && $request->header('X-Telegram-Bot-Api-Secret-Token') !== $secret) {
            return response()->json(['ok' => false], 403);
        }

        $message = $request->input('message');
        if (!$message) {
            return response()->json(['ok' => true]);
        }

        $chatId = (int) data_get($message, 'chat.id');
        if (!$chatId) {
            return response()->json(['ok' => true]);
        }

        $state = $this->getState($chatId);
        $text = trim((string) data_get($message, 'text', ''));
        $normalized = mb_strtolower($text);
        $location = data_get($message, 'location');

        if ($text === '/start' || in_array($normalized, ['salom', 'assalomu alaykum', 'hello', 'hi'], true)) {
            $this->setState($chatId, []);
            $this->sendWelcomeMessage($chatId);
            return response()->json(['ok' => true]);
        }

        if ($text !== '') {
            $languageCode = $this->findLanguageByText($text);
            if ($languageCode) {
                $state['language'] = $languageCode;
                unset($state['food_type']);
                $this->setState($chatId, $state);
                $this->sendChooseFoodTypeMessage($chatId, $languageCode);
                return response()->json(['ok' => true]);
            }

            if ($normalized === '🌐 til tanlash' || $normalized === '🌐 select language' || $text === '/language') {
                $this->sendChooseLanguageMessage($chatId);
                return response()->json(['ok' => true]);
            }

            if ($normalized === '🍽️ ovqat turi' || $normalized === '🍽️ food type' || $text === '/food') {
                if (empty($state['language'])) {
                    $this->sendChooseLanguageMessage($chatId);
                    return response()->json(['ok' => true]);
                }

                $this->sendChooseFoodTypeMessage($chatId, $state['language']);
                return response()->json(['ok' => true]);
            }

            if (!empty($state['language'])) {
                $foodType = $this->findFoodTypeByText($text, $state['language']);
                if ($foodType) {
                    $state['food_type'] = $foodType->slug;
                    $this->setState($chatId, $state);
                    $this->sendReadyForLocationMessage($chatId, $state['language'], $text);
                    return response()->json(['ok' => true]);
                }

                if (!str_starts_with($text, '/')) {
                    $state['food_type'] = $text;
                    $this->setState($chatId, $state);
                    $this->sendReadyForLocationMessage($chatId, $state['language'], $text);
                    return response()->json(['ok' => true]);
                }
            }
        }

        if ($location) {
            if (empty($state['language'])) {
                $this->sendChooseLanguageMessage($chatId);
                return response()->json(['ok' => true]);
            }

            if (empty($state['food_type'])) {
                $this->sendChooseFoodTypeMessage($chatId, $state['language']);
                return response()->json(['ok' => true]);
            }

            $this->handleLocationMessage(
                $chatId,
                (float) data_get($location, 'latitude'),
                (float) data_get($location, 'longitude'),
                $state['language'],
                $state['food_type']
            );

            return response()->json(['ok' => true]);
        }

        $lang = $state['language'] ?? 'uz';
        $messages = $this->messages($lang);

        $this->sendText(
            $chatId,
            $messages['unknown'],
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->mainKeyboardMarkup($lang),
            ]
        );

        return response()->json(['ok' => true]);
    }

    private function sendWelcomeMessage(int $chatId): void
    {
        $messages = $this->messages('uz');
        $this->sendText($chatId, $messages['welcome'], [
            'parse_mode' => 'HTML',
            'reply_markup' => $this->languageKeyboardMarkup(),
        ]);
    }

    private function sendChooseLanguageMessage(int $chatId): void
    {
        $messages = $this->messages('uz');
        $this->sendText($chatId, $messages['choose_language'], [
            'parse_mode' => 'HTML',
            'reply_markup' => $this->languageKeyboardMarkup(),
        ]);
    }

    private function sendChooseFoodTypeMessage(int $chatId, string $lang): void
    {
        $messages = $this->messages($lang);
        $this->sendText($chatId, $messages['choose_food_type'], [
            'parse_mode' => 'HTML',
            'reply_markup' => $this->foodTypeKeyboardMarkup($lang),
        ]);
    }

    private function sendReadyForLocationMessage(int $chatId, string $lang, ?string $foodLabel = null): void
    {
        $messages = $this->messages($lang);

        $text = $messages['ready_for_location'];
        if ($foodLabel && trim($foodLabel) !== '') {
            $text .= "\n\n" . ($messages['selected_food'] ?? '🍽️ Tanlangan ovqat turi: ') . "<b>" . e($foodLabel) . "</b>";
        }

        $this->sendText($chatId, $text, [
            'parse_mode' => 'HTML',
            'reply_markup' => $this->mainKeyboardMarkup($lang),
        ]);
    }

    private function handleLocationMessage(int $chatId, float $latitude, float $longitude, string $lang, string $foodTypeSlug): void
    {
        $messages = $this->messages($lang);
        $foodType = FoodType::query()->where('slug', $foodTypeSlug)->first();

        $keywords = [$foodTypeSlug];
        if ($foodType && is_array($foodType->translations)) {
            $keywords = array_merge($keywords, array_values($foodType->translations));
        }

        $normalizedKeywords = collect($keywords)
            ->filter(fn ($item) => is_string($item) && trim($item) !== '')
            ->map(fn ($item) => mb_strtolower(trim($item)))
            ->unique()
            ->values();

        $restaurants = Restaurant::query()
            ->with('location')
            ->where('is_active', true)
            ->whereHas('location')
            ->where(function ($query) use ($normalizedKeywords) {
                foreach ($normalizedKeywords as $keyword) {
                    $query->orWhereRaw('LOWER(cuisine_type) LIKE ?', ['%' . $keyword . '%']);
                }
            })
            ->get()
            ->map(function ($restaurant) use ($latitude, $longitude) {
                $earthRadius = 6371;
                $dLat = deg2rad($restaurant->location->latitude - $latitude);
                $dLon = deg2rad($restaurant->location->longitude - $longitude);
                $a = sin($dLat / 2) * sin($dLat / 2)
                    + cos(deg2rad($latitude)) * cos(deg2rad($restaurant->location->latitude))
                    * sin($dLon / 2) * sin($dLon / 2);
                $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                $distance = round($earthRadius * $c, 1);

                return [
                    'name' => $restaurant->name,
                    'address' => $restaurant->location?->address,
                    'distance' => $distance,
                    'latitude' => (float) $restaurant->location->latitude,
                    'longitude' => (float) $restaurant->location->longitude,
                ];
            })
            ->sortBy('distance')
            ->take(5)
            ->values();

        if ($restaurants->isEmpty()) {
            $this->sendText($chatId, $messages['not_found'], [
                'reply_markup' => $this->mainKeyboardMarkup($lang),
            ]);
            return;
        }

        $lines = $restaurants->map(function ($restaurant, $index) {
            $rankEmoji = match ($index) {
                0 => '🥇',
                1 => '🥈',
                2 => '🥉',
                default => '•',
            };
            $address = !empty($restaurant['address']) ? "\n   📍 {$restaurant['address']}" : '';
            $mapsUrl = "https://maps.google.com/?q={$restaurant['latitude']},{$restaurant['longitude']}";
            $mapPart = "\n   🧭 <a href=\"{$mapsUrl}\">Xaritada ko‘rish</a>";
            return "{$rankEmoji} " . ($index + 1) . ") {$restaurant['name']} — {$restaurant['distance']} km{$address}{$mapPart}";
        })->implode("\n");

        $this->sendText(
            $chatId,
            $messages['nearby_header'] . "\n\n{$lines}\n\n" . $messages['search_again'],
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->mainKeyboardMarkup($lang),
            ]
        );
    }

    private function sendText(int $chatId, string $text, array $options = []): void
    {
        $token = config('services.telegram.bot_token');

        if (empty($token)) {
            Log::warning('Telegram webhook: TELEGRAM_BOT_TOKEN topilmadi.');
            return;
        }

        $payload = array_merge([
            'chat_id' => $chatId,
            'text' => $text,
        ], $options);

        if (isset($payload['reply_markup']) && is_array($payload['reply_markup'])) {
            $payload['reply_markup'] = json_encode($payload['reply_markup'], JSON_UNESCAPED_UNICODE);
        }

        Http::asForm()->post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
    }

    private function languageKeyboardMarkup(): array
    {
        return [
            'keyboard' => [
                [['text' => self::LANGUAGES['en']], ['text' => self::LANGUAGES['ru']]],
                [['text' => self::LANGUAGES['uz']], ['text' => self::LANGUAGES['kk']]],
                [['text' => self::LANGUAGES['ky']], ['text' => self::LANGUAGES['tg']]],
                [['text' => self::LANGUAGES['tr']]],
            ],
            'resize_keyboard' => true,
            'is_persistent' => true,
        ];
    }

    private function foodTypeKeyboardMarkup(string $lang): array
    {
        $rows = FoodType::query()
            ->orderBy('id')
            ->get()
            ->map(function (FoodType $foodType) use ($lang) {
                $translations = is_array($foodType->translations) ? $foodType->translations : [];
                $label = $translations[$lang] ?? $translations['en'] ?? $foodType->slug;
                return [['text' => $label]];
            })
            ->values()
            ->all();

        return [
            'keyboard' => array_merge($rows, [
                [['text' => '🌐 Til tanlash']],
                [['text' => '🍽️ Ovqat turi']],
            ]),
            'resize_keyboard' => true,
            'is_persistent' => true,
        ];
    }

    private function mainKeyboardMarkup(string $lang): array
    {
        return [
            'keyboard' => [
                [[
                    'text' => $this->messages($lang)['share_location'],
                    'request_location' => true,
                ]],
                [['text' => '🌐 Til tanlash'], ['text' => '🍽️ Ovqat turi']],
            ],
            'resize_keyboard' => true,
            'is_persistent' => true,
        ];
    }

    private function findLanguageByText(string $text): ?string
    {
        foreach (self::LANGUAGES as $code => $label) {
            if ($text === $label) {
                return $code;
            }
        }

        return null;
    }

    private function findFoodTypeByText(string $text, string $lang): ?FoodType
    {
        $normalized = mb_strtolower(trim($text));
        $foodTypes = FoodType::query()->get();

        foreach ($foodTypes as $foodType) {
            $translations = is_array($foodType->translations) ? $foodType->translations : [];
            $labels = [
                $translations[$lang] ?? null,
                $translations['en'] ?? null,
                $foodType->slug,
            ];

            foreach ($labels as $label) {
                if (!is_string($label) || $label === '') {
                    continue;
                }

                if ($normalized === mb_strtolower($label)) {
                    return $foodType;
                }
            }
        }

        return null;
    }

    private function getState(int $chatId): array
    {
        $state = Cache::get($this->stateKey($chatId), []);
        return is_array($state) ? $state : [];
    }

    private function setState(int $chatId, array $state): void
    {
        Cache::put($this->stateKey($chatId), $state, now()->addDays(30));
    }

    private function stateKey(int $chatId): string
    {
        return 'telegram_state_' . $chatId;
    }

    private function messages(string $lang): array
    {
        $all = [
            'en' => [
                'welcome' => "🍽️ <b>Welcome!</b>\n\n1) Select language\n2) Select food type\n3) Share location",
                'choose_language' => '🌐 <b>Select language:</b>',
                'choose_food_type' => '🍽️ <b>Select food type:</b>\nYou can also type your own.',
                'ready_for_location' => '✅ Great, now share your location.',
                'selected_food' => '🍽️ Selected food type: ',
                'share_location' => '📍 Share location',
                'not_found' => '😕 No nearby restaurants for this food type.',
                'nearby_header' => '📌 <b>Nearby restaurants:</b>',
                'search_again' => 'Share location again to search again.',
                'unknown' => '🤖 Use buttons below: language, food type, or location.',
            ],
            'ru' => [
                'welcome' => "🍽️ <b>Добро пожаловать!</b>\n\n1) Выберите язык\n2) Выберите тип еды\n3) Отправьте локацию",
                'choose_language' => '🌐 <b>Выберите язык:</b>',
                'choose_food_type' => '🍽️ <b>Выберите тип еды:</b>\nМожно также написать свой вариант.',
                'ready_for_location' => '✅ Отлично, теперь отправьте локацию.',
                'selected_food' => '🍽️ Выбранный тип еды: ',
                'share_location' => '📍 Отправить локацию',
                'not_found' => '😕 Рядом не найдено ресторанов по выбранному типу еды.',
                'nearby_header' => '📌 <b>Ближайшие рестораны:</b>',
                'search_again' => 'Чтобы искать снова, отправьте локацию снова.',
                'unknown' => '🤖 Используйте кнопки: язык, тип еды, локация.',
            ],
            'uz' => [
                'welcome' => "🍽️ <b>Xush kelibsiz!</b>\n\n1) Tilni tanlang\n2) Ovqat turini tanlang\n3) Joylashuv yuboring",
                'choose_language' => '🌐 <b>Tilni tanlang:</b>',
                'choose_food_type' => '🍽️ <b>Ovqat turini tanlang:</b>\nYoki o\'zingiz yozing.',
                'ready_for_location' => '✅ Zo‘r, endi joylashuvingizni yuboring.',
                'selected_food' => '🍽️ Tanlangan ovqat turi: ',
                'share_location' => '📍 Joylashuv yuborish',
                'not_found' => '😕 Tanlangan ovqat turi uchun yaqin restoran topilmadi.',
                'nearby_header' => '📌 <b>Yaqin restoranlar:</b>',
                'search_again' => 'Qayta qidirish uchun joylashuvni yana yuboring.',
                'unknown' => '🤖 Pastdagi tugmalardan foydalaning: til, ovqat turi, joylashuv.',
            ],
            'kk' => [
                'welcome' => "🍽️ <b>Қош келдіңіз!</b>\n\n1) Тілді таңдаңыз\n2) Тағам түрін таңдаңыз\n3) Орналасқан жерді жіберіңіз",
                'choose_language' => '🌐 <b>Тілді таңдаңыз:</b>',
                'choose_food_type' => '🍽️ <b>Тағам түрін таңдаңыз:</b>\nНемесе өзіңіз жаза аласыз.',
                'ready_for_location' => '✅ Жақсы, енді орналасқан жерді жіберіңіз.',
                'selected_food' => '🍽️ Таңдалған тағам түрі: ',
                'share_location' => '📍 Орналасқан жерді жіберу',
                'not_found' => '😕 Таңдалған тағам түріне сай жақын ресторан жоқ.',
                'nearby_header' => '📌 <b>Жақын ресторандар:</b>',
                'search_again' => 'Қайта іздеу үшін орналасқан жерді қайта жіберіңіз.',
                'unknown' => '🤖 Төмендегі батырмаларды қолданыңыз: тіл, тағам түрі, орналасқан жер.',
            ],
            'ky' => [
                'welcome' => "🍽️ <b>Кош келиңиз!</b>\n\n1) Тилди тандаңыз\n2) Тамак түрүн тандаңыз\n3) Жайгашкан жерди жөнөтүңүз",
                'choose_language' => '🌐 <b>Тилди тандаңыз:</b>',
                'choose_food_type' => '🍽️ <b>Тамак түрүн тандаңыз:</b>\nЖе өзүңүз жаза аласыз.',
                'ready_for_location' => '✅ Сонун, эми жайгашкан жериңизди жөнөтүңүз.',
                'selected_food' => '🍽️ Тандалган тамак түрү: ',
                'share_location' => '📍 Жайгашкан жерди жөнөтүү',
                'not_found' => '😕 Тандалган тамак түрү боюнча жакын ресторан жок.',
                'nearby_header' => '📌 <b>Жакын ресторандар:</b>',
                'search_again' => 'Кайра издөө үчүн жайгашкан жерди кайра жөнөтүңүз.',
                'unknown' => '🤖 Төмөнкү баскычтарды колдонуңуз: тил, тамак түрү, жайгашкан жер.',
            ],
            'tg' => [
                'welcome' => "🍽️ <b>Хуш омадед!</b>\n\n1) Забонро интихоб кунед\n2) Навъи хӯрокро интихоб кунед\n3) Маконро фиристонед",
                'choose_language' => '🌐 <b>Забонро интихоб кунед:</b>',
                'choose_food_type' => '🍽️ <b>Навъи хӯрокро интихоб кунед:</b>\nЁ худатон нависед.',
                'ready_for_location' => '✅ Олиҷаноб, акнун маконро фиристонед.',
                'selected_food' => '🍽️ Навъи хӯроки интихобшуда: ',
                'share_location' => '📍 Фиристодани макон',
                'not_found' => '😕 Барои ин навъи хӯрок ресторан ёфт нашуд.',
                'nearby_header' => '📌 <b>Ресторанҳои наздик:</b>',
                'search_again' => 'Барои ҷустуҷӯи дубора маконро боз фиристонед.',
                'unknown' => '🤖 Аз тугмаҳо истифода баред: забон, навъи хӯрок, макон.',
            ],
            'tr' => [
                'welcome' => "🍽️ <b>Hoş geldiniz!</b>\n\n1) Dil seçin\n2) Yemek türü seçin\n3) Konum paylaşın",
                'choose_language' => '🌐 <b>Dil seçin:</b>',
                'choose_food_type' => '🍽️ <b>Yemek türü seçin:</b>\nKendi türünüzü de yazabilirsiniz.',
                'ready_for_location' => '✅ Harika, şimdi konumunuzu paylaşın.',
                'selected_food' => '🍽️ Seçilen yemek türü: ',
                'share_location' => '📍 Konum paylaş',
                'not_found' => '😕 Bu yemek türü için yakında restoran bulunamadı.',
                'nearby_header' => '📌 <b>Yakındaki restoranlar:</b>',
                'search_again' => 'Tekrar aramak için konumu tekrar paylaşın.',
                'unknown' => '🤖 Aşağıdaki düğmeleri kullanın: dil, yemek türü, konum.',
            ],
        ];

        return $all[$lang] ?? $all['uz'];
    }
}
