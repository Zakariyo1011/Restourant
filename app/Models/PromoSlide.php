<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromoSlide extends Model
{
    protected $fillable = [
        'badge', 'title', 'subtitle', 'image_path', 'bg_color', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'sort_order'  => 'integer',
    ];
}
