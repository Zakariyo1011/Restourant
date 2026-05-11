<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    // Google ga yo'naltirish
    public function redirectToGoogle()
    {
        $url = Socialite::driver('google')->stateless()->redirect()->getTargetUrl();
        return response()->json(['url' => $url]);
    }

    // Google callback — foydalanuvchi qaytib kelganda
    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            $user = User::updateOrCreate(
                ['google_id' => $googleUser->getId()],
                [
                    'name'     => $googleUser->getName(),
                    'email'    => $googleUser->getEmail(),
                    'role'     => 'owner',
                    'is_active' => false,
                ]
            );

            $token = $user->createToken('auth_token')->plainTextToken;

            // Vue.js frontendga yo'naltirish
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

            return redirect("{$frontendUrl}/auth/callback?token={$token}&active={$user->is_active}");

        } catch (\Exception $e) {
            return redirect(env('FRONTEND_URL') . '/login?error=google_failed');
        }
    }

    // Foydalanuvchi ma'lumotlari
    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('restaurant'),
        ]);
    }

    // Logout
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }
}