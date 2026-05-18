<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function redirectToGoogle(Request $request)
    {
        $frontend = $this->resolveFrontendUrl($request->query('frontend'));
        $state = Str::random(40);
        Cache::put("oauth_frontend:{$state}", $frontend, now()->addMinutes(10));

        return Socialite::driver('google')
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        $frontendUrl = $this->frontendUrlFromOAuthState($request->query('state'));

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            $user = User::where('google_id', $googleUser->getId())
                ->orWhere('email', $googleUser->getEmail())
                ->first();

            if ($user) {
                $user->update([
                    'google_id' => $googleUser->getId(),
                    'name'      => $googleUser->getName(),
                ]);
            } else {
                $user = User::create([
                    'google_id'  => $googleUser->getId(),
                    'name'       => $googleUser->getName(),
                    'email'      => $googleUser->getEmail(),
                    'role'       => 'owner',
                    'is_active'  => false,
                    'password'   => null,
                ]);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return redirect("{$frontendUrl}/auth/callback?token={$token}&active=" . ($user->is_active ? '1' : '0'));
        } catch (\Exception $e) {
            \Log::error('Google OAuth xato: ' . $e->getMessage());

            return redirect("{$frontendUrl}/login?error=" . urlencode($e->getMessage()));
        }
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('restaurant'),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => __('messages.logged_out')]);
    }

    private function resolveFrontendUrl(?string $requested): string
    {
        $default = rtrim(config('app.frontend_url'), '/');

        if (!$requested) {
            return $default;
        }

        $requested = rtrim($requested, '/');

        foreach (config('app.allowed_frontend_urls', []) as $allowed) {
            if (rtrim((string) $allowed, '/') === $requested) {
                return $requested;
            }
        }

        if (preg_match('#^https://[a-z0-9-]+\.vercel\.app$#i', $requested)) {
            return $requested;
        }

        return $default;
    }

    private function frontendUrlFromOAuthState(?string $state): string
    {
        $default = rtrim(config('app.frontend_url'), '/');

        if (!$state) {
            return $default;
        }

        $cached = Cache::pull("oauth_frontend:{$state}");

        return $cached ? rtrim($cached, '/') : $default;
    }
}
