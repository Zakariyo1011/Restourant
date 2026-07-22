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
                unset($state['restaurants']);
                unset($state['restaurant_index']);
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

        // Handle navigation buttons (Previous/Next)
        $lang = $state['language'] ?? 'uz';
        if (!empty($state['restaurants']) && is_array($state['restaurants'])) {
            $prevTexts = ['◀️ Oldingi', '⬅️ Previous', '← Назад', '← Артқа', '← Мурда', '← Қабли', '← Önceki'];
            $nextTexts = ['▶️ Keyingi', '➡️ Next', '→ Далее', '→ Келесі', '→ Кириме', '→ Навбати', '→ Sonraki'];
            
            if (in_array($text, $prevTexts, true)) {
                $prevIndex = ($state['restaurant_index'] ?? 0) - 1;
                if ($prevIndex >= 0) {
                    $state['restaurant_index'] = $prevIndex;
                    $this->setState($chatId, $state);
                    $this->sendRestaurantCard($chatId, $lang, $prevIndex, count($state['restaurants']));
                }
                return response()->json(['ok' => true]);
            }
            
            if (in_array($text, $nextTexts, true)) {
                $nextIndex = ($state['restaurant_index'] ?? 0) + 1;
                if ($nextIndex < count($state['restaurants'])) {
                    $state['restaurant_index'] = $nextIndex;
                    $this->setState($chatId, $state);
                    $this->sendRestaurantCard($chatId, $lang, $nextIndex, count($state['restaurants']));
                }
                return response()->json(['ok' => true]);
            }
        }

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
            ->with(['location', 'images'])
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
                    'id' => $restaurant->id,
                    'name' => $restaurant->name,
                    'address' => $restaurant->location?->address,
                    'distance' => $distance,
                    'latitude' => (float) $restaurant->location->latitude,
                    'longitude' => (float) $restaurant->location->longitude,
                    'image_path' => $restaurant->image_path,
                    'phone' => $restaurant->phone,
                    'website' => $restaurant->website,
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

        // Store restaurants array in state
        $state = $this->getState($chatId);
        $state['restaurants'] = $restaurants->toArray();
        $state['restaurant_index'] = 0;
        $this->setState($chatId, $state);

        // Show first restaurant
        $this->sendRestaurantCard($chatId, $lang, 0, count($restaurants));
    }

    private function sendRestaurantCard(int $chatId, string $lang, int $index, int $total): void
    {
        $state = $this->getState($chatId);
        if (empty($state['restaurants']) || !isset($state['restaurants'][$index])) {
            return;
        }

        $restaurant = $state['restaurants'][$index];
        $messages = $this->messages($lang);

        $rankEmoji = match ($index) {
            0 => '🥇',
            1 => '🥈',
            2 => '🥉',
            default => '•',
        };

        $caption = "{$rankEmoji} <b>{$restaurant['name']}</b>\n\n";
        
        if (!empty($restaurant['address'])) {
            $caption .= "📍 <b>" . $messages['address'] . ":</b> {$restaurant['address']}\n";
        }
        
        $caption .= "📏 <b>" . $messages['distance'] . ":</b> {$restaurant['distance']} km\n";
        
        if (!empty($restaurant['phone'])) {
            $caption .= "📞 <b>" . $messages['phone'] . ":</b> {$restaurant['phone']}\n";
        }
        
        if (!empty($restaurant['website'])) {
            $caption .= "🌐 <b>" . $messages['website'] . ":</b> {$restaurant['website']}\n";
        }

        $mapsUrl = "https://maps.google.com/?q={$restaurant['latitude']},{$restaurant['longitude']}&z=16";
        $caption .= "\n🧭 <a href=\"{$mapsUrl}\">" . $messages['view_on_map'] . "</a>";
        
        $caption .= "\n\n(" . ($index + 1) . "/" . $total . ")";

        $options = [
            'parse_mode' => 'HTML',
            'reply_markup' => $this->restaurantNavigationMarkup($lang, $index, $total),
        ];

        // Send with image if available
        if (!empty($restaurant['image_path'])) {
            $this->sendPhoto($chatId, $restaurant['image_path'], $caption, $options);
        } else {
            $this->sendText($chatId, $caption, $options);
        }
    }

    private function sendPhoto(int $chatId, string $photoUrl, string $caption, array $options = []): void
    {
        $token = config('services.telegram.bot_token');

        if (empty($token)) {
            Log::warning('Telegram webhook: TELEGRAM_BOT_TOKEN topilmadi.');
            return;
        }

        $payload = array_merge([
            'chat_id' => $chatId,
            'photo' => $photoUrl,
            'caption' => $caption,
        ], $options);

        if (isset($payload['reply_markup']) && is_array($payload['reply_markup'])) {
            $payload['reply_markup'] = json_encode($payload['reply_markup'], JSON_UNESCAPED_UNICODE);
        }

        Http::asForm()->post("https://api.telegram.org/bot{$token}/sendPhoto", $payload);
    }

    private function restaurantNavigationMarkup(string $lang, int $index, int $total): array
    {
        $messages = $this->messages($lang);
        $buttons = [];

        if ($index > 0) {
            $buttons[] = ['text' => '◀️ ' . $messages['previous'], 'callback_data' => 'prev'];
        }

        if ($index < $total - 1) {
            $buttons[] = ['text' => '▶️ ' . $messages['next'], 'callback_data' => 'next'];
        }

        $buttons[] = ['text' => '🏠 ' . $messages['main_menu'], 'callback_data' => 'menu'];

        return [
            'inline_keyboard' => [
                $buttons,
            ],
        ];
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
                'address' => 'Address',
                'distance' => 'Distance',
                'phone' => 'Phone',
                'website' => 'Website',
                'view_on_map' => 'View on map',
                'previous' => 'Previous',
                'next' => 'Next',
                'main_menu' => 'Main menu',
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
                'address' => 'Адрес',
                'distance' => 'Расстояние',
                'phone' => 'Телефон',
                'website' => 'Сайт',
                'view_on_map' => 'Посмотреть на карте',
                'previous' => 'Назад',
                'next' => 'Далее',
                'main_menu' => 'Главное меню',
            ],
            'uz' => [
                'welcome' => "🍽️ <b>Xush kelibsiz!</b>\n\n1) Tilni tanlang\n2) Ovqat turini tanlang\n3) Joylashuv yuboring",
                'choose_language' => '🌐 <b>Tilni tanlang:</b>',
                'choose_food_type' => "🍽️ <b>Ovqat turini tanlang:</b>\nYoki o'zingiz yozing.",
                'ready_for_location' => "✅ Zo'r, endi joylashuvingizni yuboring.",
                'selected_food' => '🍽️ Tanlangan ovqat turi: ',
                'share_location' => '📍 Joylashuv yuborish',
                'not_found' => '😕 Tanlangan ovqat turi uchun yaqin restoran topilmadi.',
                'nearby_header' => '📌 <b>Yaqin restoranlar:</b>',
                'search_again' => 'Qayta qidirish uchun joylashuvni yana yuboring.',
                'unknown' => '🤖 Pastdagi tugmalardan foydalaning: til, ovqat turi, joylashuv.',
                'address' => 'Manzil',
                'distance' => 'Masofa',
                'phone' => 'Telefon',
                'website' => 'Sayt',
                'view_on_map' => "Xaritada ko'rish",
                'previous' => 'Oldingi',
                'next' => 'Keyingi',
                'main_menu' => 'Bosh menyu',
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
                'address' => 'Мекенжайы',
                'distance' => 'Қашықтық',
                'phone' => 'Телефон',
                'website' => 'Веб-сайт',
                'view_on_map' => 'Картада қарау',
                'previous' => 'Артқа',
                'next' => 'Келесі',
                'main_menu' => 'Негізгі мәзір',
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
                'address' => 'Адреси',
                'distance' => 'Аралык',
                'phone' => 'Телефон',
                'website' => 'Веб-сайты',
                'view_on_map' => 'Картада көрүнүз',
                'previous' => 'Мурда',
                'next' => 'Кириме',
                'main_menu' => 'Башкы меню',
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
                'address' => 'Суроғаи',
                'distance' => 'Фосила',
                'phone' => 'Телефон',
                'website' => 'Вебсайт',
                'view_on_map' => 'Дар харита бубинед',
                'previous' => 'Қабли',
                'next' => 'Навбати',
                'main_menu' => 'Менюи асосӣ',
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
                'address' => 'Adres',
                'distance' => 'Mesafe',
                'phone' => 'Telefon',
                'website' => 'Website',
                'view_on_map' => 'Haritada görüntüle',
                'previous' => 'Önceki',
                'next' => 'Sonraki',
                'main_menu' => 'Ana menü',
            ],
        ];

        return $all[$lang] ?? $all['uz'];
    }
}
