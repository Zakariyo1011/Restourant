import { Context } from 'telegraf';
import { getNearbyRestaurants } from '../../services/restaurant.service';
import { Location } from '../../types';

export const locationHandler = async (ctx: Context) => {
    const message = ctx.message as { location?: Location } | undefined;
    const location = message?.location;

    if (!location) {
        await ctx.reply('Iltimos, o\'zingizning joylashuvingizni yuboring.');
        return;
    }

    let nearbyRestaurants = [];

    try {
        nearbyRestaurants = await getNearbyRestaurants(location);
    } catch (error) {
        console.error('Nearby restaurants fetch failed:', error);
        await ctx.reply('Restoranlarni olishda xatolik bo‘ldi. Keyinroq qayta urinib ko‘ring.');
        return;
    }

    if (nearbyRestaurants.length === 0) {
        await ctx.reply('Yaqin atrofda restoran topilmadi.');
        return;
    }

    const responseMessage = nearbyRestaurants
        .map((restaurant, index) => {
            const addressPart = restaurant.address ? `\n   📍 ${restaurant.address}` : '';
            return `${index + 1}) ${restaurant.name} — ${restaurant.distance.toFixed(1)} km${addressPart}`;
        })
        .join('\n');

    await ctx.replyWithHTML(
        `📌 <b>Sizga eng yaqin restoranlar:</b>\n\n${responseMessage}\n\n` +
        'Yana qidirish uchun qayta joylashuv yuborishingiz mumkin.',
    );
};