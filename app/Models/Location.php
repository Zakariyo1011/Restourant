<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    protected $fillable = [
        'restaurant_id',
        'latitude',
        'longitude',
        'address',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }
}