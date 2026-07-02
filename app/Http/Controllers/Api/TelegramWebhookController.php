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
        $location = data_get($message, 'location');

        if ($location) {
            $this->handleLocationMessage(
                (int) $chatId,
                (float) data_get($location, 'latitude'),
                (float) data_get($location, 'longitude')
            );

            return response()->json(['ok' => true]);
        }

        if ($text === '/start' || $text === '📋 Menyu') {
            $this->sendWelcomeMessage((int) $chatId);
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

        $this->sendText(
            (int) $chatId,
            'Iltimos, pastdagi 📍 tugma orqali joylashuvingizni yuboring yoki ❓ Yordam ni bosing.',
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
            '🍽️ <b>Restoran Finder botiga xush kelibsiz!</b>\n\n'
                . 'Yaqiningizdagi eng yaxshi restoranlarni topib beraman.\n\n'
                . '1) <b>📍 Joylashuv yuborish</b> tugmasini bosing\n'
                . '2) Joylashuvingizni yuboring\n'
                . '3) Sizga eng yaqin <b>5 ta restoran</b> ro‘yxatini chiqaraman ✅',
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
            '❓ <b>Yordam</b>\n\n'
                . '• <b>📍 Joylashuv yuborish</b> tugmasini bosing\n'
                . '• Joylashuvingizni yuboring\n'
                . '• Men sizga eng yaqin 5 ta restoran ro‘yxatini chiqaraman',
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
            'ℹ️ <b>Bot haqida</b>\n\n'
                . 'Ushbu bot siz yuborgan joylashuv asosida restoranlarni masofa bo‘yicha topadi.\n'
                . 'Ma’lumotlar Restourant platformasi API dan olinadi.',
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
                ];
            })
            ->sortBy('distance')
            ->take(5)
            ->values();

        if ($restaurants->isEmpty()) {
            $this->sendText($chatId, 'Yaqin atrofda restoran topilmadi.', [
                'reply_markup' => $this->keyboardMarkup(),
            ]);
            return;
        }

        $lines = $restaurants->map(function ($restaurant, $index) {
            $address = !empty($restaurant['address']) ? "\n   📍 {$restaurant['address']}" : '';
            return ($index + 1) . ") {$restaurant['name']} — {$restaurant['distance']} km{$address}";
        })->implode("\n");

        $this->sendText(
            $chatId,
            "📌 <b>Sizga eng yaqin restoranlar:</b>\n\n{$lines}\n\nYana qidirish uchun joylashuvingizni qayta yuboring.",
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
                    ['text' => '❓ Yordam'],
                    ['text' => 'ℹ️ Bot haqida'],
                ],
            ],
            'resize_keyboard' => true,
            'is_persistent' => true,
        ];
    }
}
