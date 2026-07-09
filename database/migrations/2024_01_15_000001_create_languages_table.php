<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('languages')) {
            Schema::create('languages', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique(); // en, ru, uz, kk, ky, tg, tr
                $table->string('name');
                $table->string('native_name');
                $table->string('flag');
            });
        }

        DB::table('languages')->upsert([
            ['code' => 'en', 'name' => 'English', 'native_name' => 'English', 'flag' => '🇬🇧'],
            ['code' => 'ru', 'name' => 'Russian', 'native_name' => 'Русский', 'flag' => '🇷🇺'],
            ['code' => 'uz', 'name' => 'Uzbek', 'native_name' => "O'zbek", 'flag' => '🇺🇿'],
            ['code' => 'kk', 'name' => 'Kazakh', 'native_name' => 'Қазақша', 'flag' => '🇰🇿'],
            ['code' => 'ky', 'name' => 'Kyrgyz', 'native_name' => 'Кыргызча', 'flag' => '🇰🇬'],
            ['code' => 'tg', 'name' => 'Tajik', 'native_name' => 'Тоҷикӣ', 'flag' => '🇹🇯'],
            ['code' => 'tr', 'name' => 'Turkish', 'native_name' => 'Türkçe', 'flag' => '🇹🇷'],
        ], ['code'], ['name', 'native_name', 'flag']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('languages');
    }
};
