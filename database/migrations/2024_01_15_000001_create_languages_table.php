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

        if (! Schema::hasColumn('languages', 'code')) {
            Schema::table('languages', function (Blueprint $table) {
                $table->string('code')->nullable()->after('id');
            });
        }

        if (! Schema::hasColumn('languages', 'name')) {
            Schema::table('languages', function (Blueprint $table) {
                $table->string('name')->nullable()->after('code');
            });
        }

        if (! Schema::hasColumn('languages', 'native_name')) {
            Schema::table('languages', function (Blueprint $table) {
                $table->string('native_name')->nullable()->after('name');
            });
        }

        $hasFlagColumn = Schema::hasColumn('languages', 'flag');

        if (! $hasFlagColumn) {
            Schema::table('languages', function (Blueprint $table) {
                $table->string('flag')->nullable()->after('native_name');
            });
            $hasFlagColumn = true;
        }

        $records = [
            ['code' => 'en', 'name' => 'English', 'native_name' => 'English', 'flag' => '🇬🇧'],
            ['code' => 'ru', 'name' => 'Russian', 'native_name' => 'Русский', 'flag' => '🇷🇺'],
            ['code' => 'uz', 'name' => 'Uzbek', 'native_name' => "O'zbek", 'flag' => '🇺🇿'],
            ['code' => 'kk', 'name' => 'Kazakh', 'native_name' => 'Қазақша', 'flag' => '🇰🇿'],
            ['code' => 'ky', 'name' => 'Kyrgyz', 'native_name' => 'Кыргызча', 'flag' => '🇰🇬'],
            ['code' => 'tg', 'name' => 'Tajik', 'native_name' => 'Тоҷикӣ', 'flag' => '🇹🇯'],
            ['code' => 'tr', 'name' => 'Turkish', 'native_name' => 'Türkçe', 'flag' => '🇹🇷'],
        ];

        if (! $hasFlagColumn) {
            $records = array_map(function (array $item) {
                unset($item['flag']);
                return $item;
            }, $records);
        }

        $updateColumns = ['name', 'native_name'];

        if ($hasFlagColumn) {
            $updateColumns[] = 'flag';
        }

        DB::table('languages')->upsert($records, ['code'], $updateColumns);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('languages');
    }
};
