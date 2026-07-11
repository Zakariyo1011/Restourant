<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\RestaurantImage;

class Restaurant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'phone',
        'image_path',
        'is_active',
        'cuisine_type',
        'country',
        'city',
        'price_range',
        'working_hours',
        'website',
        'instagram',
        'google_place_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'working_hours' => 'array',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function images()
    {
        return $this->hasMany(RestaurantImage::class);
    }

    public function location()
    {
        return $this->hasOne(Location::class);
    }
}