<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FoodType extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'translations',
    ];

    protected $casts = [
        'translations' => 'json',
    ];
}
