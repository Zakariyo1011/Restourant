<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'google_id',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_active'         => 'boolean',
        ];
    }

    // Restoran egasimi?
    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    // Adminmi?
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    // Egasining restorani
    public function restaurant()
    {
        return $this->hasOne(Restaurant::class);
    }
}