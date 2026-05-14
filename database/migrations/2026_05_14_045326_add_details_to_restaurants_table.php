<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->string('cuisine_type')->nullable()->after('phone');     // O'zbek, Turk, Arab...
            $table->string('country')->nullable()->after('cuisine_type');   // Qaysi davlatda
            $table->string('city')->nullable()->after('country');           // Qaysi shaharda
            $table->string('price_range')->nullable()->after('city');       // $, $$, $$$
            $table->json('working_hours')->nullable()->after('price_range');// Ish vaqti
            $table->string('website')->nullable()->after('working_hours');  // Veb-sayt
            $table->string('instagram')->nullable()->after('website');      // Instagram
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn([
                'cuisine_type', 'country', 'city',
                'price_range', 'working_hours', 'website', 'instagram'
            ]);
        });
    }
};