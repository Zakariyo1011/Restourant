<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
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

        $chatId = data_get($message, 'chat.id');
        if (!$chatId) {
            return response()->json(['ok' => true]);
        }

        $text = trim((string) data_get($message, 'text', ''));
        $normalizedText = mb_strtolower($text);
        $location = data_get($message, 'location');

        if ($location) {
            $this->handleLocationMessage(
                (int) $chatId,
                (float) data_get($location, 'latitude'),
                (float) data_get($location, 'longitude')
            );

            return response()->json(['ok' => true]);
        }

        if ($text === '/start') {
            $this->sendWelcomeMessage((int) $chatId);
            return response()->json(['ok' => true]);
        }

        if ($text === '/menu' || $text === '📋 Menyu') {
            $this->sendMenuMessage((int) $chatId);
            return response()->json(['ok' => true]);
        }

        if ($text === '/help' || $text === '❓ Yordam') {
            $this->sendHelpMessage((int) $chatId);
            return response()->json(['ok' => true]);
        }

        if ($text === '/about' || $text === 'ℹ️ Bot haqida') {
            $this->sendAboutMessage((int) $chatId);
            return response()->json(['ok' => true]);
        }

        if (in_array($normalizedText, ['salom', 'assalomu alaykum', 'hello', 'hi'], true)) {
            $this->sendWelcomeMessage((int) $chatId);
            return response()->json(['ok' => true]);
        }

        $this->sendText(
            (int) $chatId,
            '🤖 Xabarni tushunmadim.\n\n'
                . 'Iltimos, <b>📍 Joylashuv yuborish</b> tugmasini bosing yoki <b>📋 Menyu</b>ni oching.',
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->keyboardMarkup(),
            ]
        );

        return response()->json(['ok' => true]);
    }

    private function sendWelcomeMessage(int $chatId): void
    {
        $this->sendText(
            $chatId,
            "🍽️ <b>Restourant botiga xush kelibsiz!</b>\n\n"
                . "Men sizga yaqin atrofdagi eng mos restoranlarni topib beraman.\n\n"
                . "⚡ <b>Qanday ishlaydi?</b>\n"
                . "📱 <b>Telefon:</b> <b>📍 Joylashuv yuborish</b> tugmasini bosing\n"
                . "💻 <b>Mac / Desktop:</b> <b>📎 → Location</b> tugmasini bosing\n\n"
                . "Boshlashga tayyormisiz? 🚀",
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->keyboardMarkup(),
            ]
        );
    }

    private function sendHelpMessage(int $chatId): void
    {
        $this->sendText(
            $chatId,
            "❓ <b>Yordam</b>\n\n"
                . "📱 <b>Telefon:</b>\n"
                . "Pastdagi <b>📍 Joylashuv yuborish</b> tugmasini bosing\n\n"
                . "💻 <b>Mac / Desktop:</b>\n"
                . "Chat pastidagi <b>📎 ikonkasi → Location</b> ni tanlang\n\n"
                . "• <b>/menu</b> — bosh menyu\n"
                . "• <b>/about</b> — bot haqida",
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->keyboardMarkup(),
            ]
        );
    }

    private function sendMenuMessage(int $chatId): void
    {
        $this->sendText(
            $chatId,
            "📋 <b>Asosiy menyu</b>\n\n"
                . "• <b>📍 Joylashuv yuborish</b> — yaqin restoranlarni topish\n"
                . "• <b>❓ Yordam</b> — foydalanish yo'riqnomasi\n"
                . "• <b>ℹ️ Bot haqida</b> — loyiha haqida ma'lumot\n\n"
                . "Davom etish uchun lokatsiyangizni yuboring 👇",
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->keyboardMarkup(),
            ]
        );
    }

    private function sendAboutMessage(int $chatId): void
    {
        $this->sendText(
            $chatId,
            "ℹ️ <b>Bot haqida</b>\n\n"
                . "Ushbu bot siz yuborgan joylashuv asosida restoranlarni masofa bo'yicha topadi.\n"
                . "Ma'lumotlar Restourant platformasi API dan olinadi.\n\n"
                . "Sifatli tavsiyalar uchun lokatsiyani aniq yuboring 📍",
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->keyboardMarkup(),
            ]
        );
    }

    private function handleLocationMessage(int $chatId, float $latitude, float $longitude): void
    {
        $restaurants = Restaurant::query()
            ->with('location')
            ->where('is_active', true)
            ->whereHas('location')
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
            $this->sendText(
                $chatId,
                '😕 Yaqin atrofda restoran topilmadi.\n\nBiroz boshqa nuqtadan lokatsiya yuborib ko‘ring.',
                [
                    'reply_markup' => $this->keyboardMarkup(),
                ]
            );
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
            "📌 <b>Sizga eng yaqin restoranlar:</b>\n\n{$lines}\n\nYana qidirish uchun joylashuvingizni qayta yuboring ✅",
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->keyboardMarkup(),
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

    private function keyboardMarkup(): array
    {
        return [
            'keyboard' => [
                [
                    [
                        'text' => '📍 Joylashuv yuborish',
                        'request_location' => true,
                    ],
                ],
                [
                    ['text' => '📋 Menyu'],
                ],
                [
                    ['text' => '❓ Yordam'],
                    ['text' => 'ℹ️ Bot haqida'],
                ],
            ],
            'resize_keyboard' => true,
            'is_persistent' => true,
        ];
    }
}
