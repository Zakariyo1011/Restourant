<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Restaurant;
use App\Models\User;

class RestaurantSeeder extends Seeder
{
    public function run(): void
    {
        // Avval bitta owner user yaratamiz
        $user = User::firstOrCreate(
            ['email' => 'test@london.com'],
            [
                'name' => 'Test Owner',
                'role' => 'owner',
                'is_active' => true,
                'password' => null,
            ]
        );

        $restaurants = [
            [
                'name' => 'The Ledbury',
                'description' => 'Zamonaviy Evropa taomlari bilan mashhur London restorani. Ikki Michelin yulduzi.',
                'address' => '127 Ledbury Rd, London W11 2AQ',
                'phone' => '+44 20 7792 9090',
                'is_active' => true,
            ],
            [
                'name' => 'Sketch London',
                'description' => 'Noyob dizayn va frantsuz taomlari bilan ajralib turadigan restoran.',
                'address' => '9 Conduit St, London W1S 2XG',
                'phone' => '+44 20 7659 4500',
                'is_active' => true,
            ],
            [
                'name' => 'Dishoom',
                'description' => 'Bombay uslubidagi kafe, mashhur non va chai bilan.',
                'address' => '12 Upper St Martin\'s Ln, London WC2H 9FB',
                'phone' => '+44 20 7420 9320',
                'is_active' => true,
            ],
            [
                'name' => 'Flat Iron',
                'description' => 'Arzon va mazali steak restorani, London bo\'ylab bir nechta filiallari bor.',
                'address' => '17 Henrietta St, London WC2E 8QH',
                'phone' => '+44 20 3019 0007',
                'is_active' => true,
            ],
            [
                'name' => 'Ottolenghi',
                'description' => 'O\'rta Sharq va Mediterran taomlari bilan mashhur.',
                'address' => '287 Upper St, London N1 2TZ',
                'phone' => '+44 20 7288 1454',
                'is_active' => true,
            ],
            [
                'name' => 'Hawksmoor',
                'description' => 'London\'ning eng yaxshi steak va dengiz mahsulotlari restorani.',
                'address' => '5A Air St, London W1J 0AD',
                'phone' => '+44 20 7406 3980',
                'is_active' => true,
            ],
            [
                'name' => 'Gymkhana',
                'description' => 'Hindiston kolonial davridan ilhomlangan zamonaviy hind taomlari.',
                'address' => '42 Albemarle St, London W1S 4JH',
                'phone' => '+44 20 3011 5900',
                'is_active' => true,
            ],
            [
                'name' => 'Brat',
                'description' => 'O\'tin olovida pishirilgan taomlar, Shoreditch da joylashgan.',
                'address' => '4 Redchurch St, London E1 6JL',
                'phone' => '+44 20 7613 0015',
                'is_active' => true,
            ],
            [
                'name' => 'St. John',
                'description' => 'Britaniya milliy taomlari, burun-to-tail yemak falsafasi.',
                'address' => '26 St John St, London EC1M 4AY',
                'phone' => '+44 20 7251 0848',
                'is_active' => true,
            ],
            [
                'name' => 'Smoking Goat',
                'description' => 'Tailand bar va restoran, temir tovada pishirilgan taomlar.',
                'address' => '64 Shoreditch High St, London E1 6JJ',
                'phone' => '+44 20 3310 2077',
                'is_active' => true,
            ],
        ];

        foreach ($restaurants as $data) {
            Restaurant::create(array_merge($data, ['user_id' => $user->id]));
        }
    }
}