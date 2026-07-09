<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('food_types', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->json('translations'); // { en: 'Pizza', ru: 'Пицца', uz: 'Pitsa', ... }
            $table->timestamps();
        });

        // Insert food types
        \Illuminate\Support\Facades\DB::table('food_types')->insert([
            [
                'slug' => 'pizza',
                'translations' => json_encode([
                    'en' => 'Pizza',
                    'ru' => 'Пицца',
                    'uz' => 'Pitsa',
                    'kk' => 'Пицца',
                    'ky' => 'Пицца',
                    'tg' => 'Пицца',
                    'tr' => 'Pizza',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'burger',
                'translations' => json_encode([
                    'en' => 'Burger',
                    'ru' => 'Бургер',
                    'uz' => 'Burger',
                    'kk' => 'Бургер',
                    'ky' => 'Бургер',
                    'tg' => 'Бургер',
                    'tr' => 'Burger',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'sushi',
                'translations' => json_encode([
                    'en' => 'Sushi',
                    'ru' => 'Суши',
                    'uz' => 'Sushi',
                    'kk' => 'Суши',
                    'ky' => 'Суши',
                    'tg' => 'Суши',
                    'tr' => 'Suşi',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'shawarma',
                'translations' => json_encode([
                    'en' => 'Shawarma',
                    'ru' => 'Шаурма',
                    'uz' => 'Shavarma',
                    'kk' => 'Шаурма',
                    'ky' => 'Шаурма',
                    'tg' => 'Шаурма',
                    'tr' => 'Şawarma',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'plov',
                'translations' => json_encode([
                    'en' => 'Plov',
                    'ru' => 'Плов',
                    'uz' => 'Osh',
                    'kk' => 'Плов',
                    'ky' => 'Плов',
                    'tg' => 'Плов',
                    'tr' => 'Pilav',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'kebab',
                'translations' => json_encode([
                    'en' => 'Kebab',
                    'ru' => 'Кебаб',
                    'uz' => 'Kabob',
                    'kk' => 'Кебап',
                    'ky' => 'Кебап',
                    'tg' => 'Кабоб',
                    'tr' => 'Kebap',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'noodles',
                'translations' => json_encode([
                    'en' => 'Noodles',
                    'ru' => 'Лапша',
                    'uz' => 'Lapsha',
                    'kk' => 'Лапша',
                    'ky' => 'Лапша',
                    'tg' => 'Лапша',
                    'tr' => 'Erişte',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'bakery',
                'translations' => json_encode([
                    'en' => 'Bakery',
                    'ru' => 'Булочная',
                    'uz' => 'Nonvoy',
                    'kk' => 'Нан дүккені',
                    'ky' => 'Нан дүкөнү',
                    'tg' => 'Нонвой',
                    'tr' => 'Fırın',
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('food_types');
    }
};
