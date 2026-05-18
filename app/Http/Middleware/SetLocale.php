<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public const SUPPORTED = ['en', 'ru', 'uz', 'kk', 'ky', 'tg'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->header('Accept-Language')
            ?? $request->query('lang')
            ?? config('app.locale', 'uz');

        $locale = strtolower(substr((string) $locale, 0, 2));

        if (!in_array($locale, self::SUPPORTED, true)) {
            $locale = 'uz';
        }

        App::setLocale($locale);

        return $next($request);
    }
}
