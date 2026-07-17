<?php

namespace App\Http\Controllers\Api;

use App\Models\PromoSlide;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PromoSlideController extends Controller
{
    // Public
    public function index()
    {
        $slides = PromoSlide::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn($s) => [
                'id'       => $s->id,
                'badge'    => $s->badge,
                'title'    => $s->title,
                'subtitle' => $s->subtitle,
                'image'    => $s->image_path ? url(Storage::url($s->image_path)) : null,
                'bg'       => $s->bg_color,
            ]);
        return response()->json($slides);
    }

    // Admin: all
    public function adminIndex()
    {
        return response()->json(PromoSlide::orderBy('sort_order')->get());
    }

    // Admin: create
    public function store(Request $request)
    {
        $data = $request->validate([
            'badge'      => 'nullable|string|max:40',
            'title'      => 'required|string|max:120',
            'subtitle'   => 'nullable|string|max:200',
            'bg_color'   => 'nullable|string|max:200',
            'sort_order' => 'nullable|integer',
            'is_active'  => 'nullable|boolean',
            'image'      => 'nullable|image|max:4096',
        ]);

        $path = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('promo_slides', 'public');
        }

        $slide = PromoSlide::create([
            'badge'      => $data['badge']      ?? null,
            'title'      => $data['title'],
            'subtitle'   => $data['subtitle']   ?? null,
            'bg_color'   => $data['bg_color']   ?? 'linear-gradient(120deg, #0f6e56 0%, #1d9e75 100%)',
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active'  => array_key_exists('is_active', $data) ? $data['is_active'] : true,
            'image_path' => $path,
        ]);

        return response()->json($slide, 201);
    }

    // Admin: update
    public function update(Request $request, PromoSlide $promoSlide)
    {
        $data = $request->validate([
            'badge'      => 'nullable|string|max:40',
            'title'      => 'sometimes|required|string|max:120',
            'subtitle'   => 'nullable|string|max:200',
            'bg_color'   => 'nullable|string|max:200',
            'sort_order' => 'nullable|integer',
            'is_active'  => 'nullable|boolean',
            'image'      => 'nullable|image|max:4096',
        ]);

        if ($request->hasFile('image')) {
            if ($promoSlide->image_path) {
                Storage::disk('public')->delete($promoSlide->image_path);
            }
            $data['image_path'] = $request->file('image')->store('promo_slides', 'public');
        }

        $promoSlide->update($data);
        return response()->json($promoSlide);
    }

    // Admin: delete
    public function destroy(PromoSlide $promoSlide)
    {
        if ($promoSlide->image_path) {
            Storage::disk('public')->delete($promoSlide->image_path);
        }
        $promoSlide->delete();
        return response()->json(['ok' => true]);
    }
}
