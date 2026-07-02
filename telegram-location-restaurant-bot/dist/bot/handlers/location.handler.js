"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationHandler = void 0;
const restaurant_service_1 = require("../../services/restaurant.service");
const locationHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const message = ctx.message;
    const location = message === null || message === void 0 ? void 0 : message.location;
    if (!location) {
        yield ctx.reply('Iltimos, o\'zingizning joylashuvingizni yuboring.');
        return;
    }
    let nearbyRestaurants = [];
    try {
        nearbyRestaurants = yield (0, restaurant_service_1.getNearbyRestaurants)(location);
    }
    catch (error) {
        console.error('Nearby restaurants fetch failed:', error);
        yield ctx.reply('Restoranlarni olishda xatolik bo‘ldi. Keyinroq qayta urinib ko‘ring.');
        return;
    }
    if (nearbyRestaurants.length === 0) {
        yield ctx.reply('Yaqin atrofda restoran topilmadi.');
        return;
    }
    const responseMessage = nearbyRestaurants
        .map((restaurant, index) => {
        const addressPart = restaurant.address ? `\n   📍 ${restaurant.address}` : '';
        return `${index + 1}) ${restaurant.name} — ${restaurant.distance.toFixed(1)} km${addressPart}`;
    })
        .join('\n');
    yield ctx.replyWithHTML(`📌 <b>Sizga eng yaqin restoranlar:</b>\n\n${responseMessage}\n\n` +
        'Yana qidirish uchun qayta joylashuv yuborishingiz mumkin.');
});
exports.locationHandler = locationHandler;
