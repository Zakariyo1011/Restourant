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
    return Socialite::driver('google')->stateless()->redirect();
}
    // Google callback — foydalanuvchi qaytib kelganda
 public function handleGoogleCallback()
{
    try {
        $googleUser = Socialite::driver('google')->stateless()->user();

        // Avval mavjud userni qidirish
        $user = User::where('google_id', $googleUser->getId())
                    ->orWhere('email', $googleUser->getEmail())
                    ->first();

        if ($user) {
            // Mavjud user — faqat google_id yangilash, role o'zgartirmaslik
            $user->update([
                'google_id' => $googleUser->getId(),
                'name'      => $googleUser->getName(),
            ]);
        } else {
            // Yangi user yaratish
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
        $frontendUrl = rtrim(config('app.frontend_url'), '/');

        return redirect("{$frontendUrl}/auth/callback?token={$token}&active=" . ($user->is_active ? '1' : '0'));

    } catch (\Exception $e) {
        \Log::error('Google OAuth xato: ' . $e->getMessage());
        return redirect(rtrim(config('app.frontend_url'), '/') . '/login?error=' . urlencode($e->getMessage()));
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