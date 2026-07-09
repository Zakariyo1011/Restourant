<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE restaurant_images MODIFY url TEXT NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE restaurant_images MODIFY url TEXT NOT NULL');
    }
};
