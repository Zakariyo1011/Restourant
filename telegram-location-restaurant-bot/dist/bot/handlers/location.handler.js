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
const getMessages = (language) => ({
    requesting: {
        en: 'Please share your location.',
        ru: 'Пожалуйста, поделитесь своим местоположением.',
        uz: 'Iltimos, joylashuvingizni ulashing.',
        kk: 'Орналасқан жерін бөлісіңіз.',
        ky: 'Жайгашкан жеринизди бөлүшүңүз.',
        tg: 'Мамлакати худро бугузорӣ кунед.',
        tr: 'Lütfen konumunuzu paylaşın.',
    },
    fetchError: {
        en: 'Error fetching restaurants. Please try again later.',
        ru: 'Ошибка при получении ресторанов. Попробуйте позже.',
        uz: 'Restoranlarni olishda xatolik. Keyinroq qayta urinib ko\'ring.',
        kk: 'Рестораны алуда қате. Кейінірек қайта көруге тырысыңыз.',
        ky: 'Рестораны алуу чеберчилигинде каталык. Кечиктирип кайра аракет кылыңыз.',
        tg: 'Хатогӣ дар гирифтани рестораниҳо. Дубора кӯшиш кунед.',
        tr: 'Restoranları alırken hata. Lütfen tekrar deneyin.',
    },
    notFound: {
        en: 'No restaurants found nearby.',
        ru: 'Рестораны поблизости не найдены.',
        uz: 'Yaqin atrofda restoran topilmadi.',
        kk: 'Жақын аймақта ресторан табылмады.',
        ky: 'Жакын жерде ресторан табылган жок.',
        tg: 'Рестораниҳо наздик найм нашуданд.',
        tr: 'Yakında restoran bulunamadı.',
    },
    header: {
        en: '📌 <b>Nearby restaurants:</b>\n\n',
        ru: '📌 <b>Рестораны поблизости:</b>\n\n',
        uz: '📌 <b>Yaqin restoranlar:</b>\n\n',
        kk: '📌 <b>Жақын рестораны:</b>\n\n',
        ky: '📌 <b>Жакын рестораны:</b>\n\n',
        tg: '📌 <b>Рестораниҳои наздик:</b>\n\n',
        tr: '📌 <b>Yakındaki restoranlar:</b>\n\n',
    },
    footer: {
        en: '\n\nShare your location again to search again.',
        ru: '\n\nПоделитесь своим местоположением еще раз для повторного поиска.',
        uz: '\n\nQayta qidirish uchun yana joylashuv yuborishingiz mumkin.',
        kk: '\n\nҚайта іздеу үшін орналасқан жеріңізді қайта бөлісіңіз.',
        ky: '\n\nКайра издөө үчүн жайгашкан жеринизди дагы бир жолу бөлүшүңүз.',
        tg: '\n\nБарои ҷустуҷӯи дубора мамлакати худро дубора бугузорӣ кунед.',
        tr: '\n\nTekrar aramak için konumunuzu tekrar paylaşın.',
    },
});
const locationHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const message = ctx.message;
    const location = message === null || message === void 0 ? void 0 : message.location;
    const language = (((_a = ctx.session) === null || _a === void 0 ? void 0 : _a.language) || 'en');
    const foodType = (((_b = ctx.session) === null || _b === void 0 ? void 0 : _b.foodType) || '');
    const msgs = getMessages(language);
    if (!location) {
        yield ctx.reply(msgs.requesting[language] || msgs.requesting.en);
        return;
    }
    let nearbyRestaurants = [];
    try {
        nearbyRestaurants = yield (0, restaurant_service_1.getNearbyRestaurants)(location);
        // Filter by food type if selected
        if (foodType) {
            nearbyRestaurants = nearbyRestaurants.filter((r) => r.cuisine_type && r.cuisine_type.toLowerCase().includes(foodType.toLowerCase()));
        }
    }
    catch (error) {
        console.error('Nearby restaurants fetch failed:', error);
        yield ctx.reply(msgs.fetchError[language] || msgs.fetchError.en);
        return;
    }
    if (nearbyRestaurants.length === 0) {
        yield ctx.reply(msgs.notFound[language] || msgs.notFound.en);
        return;
    }
    const responseMessage = nearbyRestaurants
        .map((restaurant, index) => {
        const addressPart = restaurant.address ? `\n   📍 ${restaurant.address}` : '';
        return `${index + 1}) ${restaurant.name} — ${restaurant.distance.toFixed(1)} km${addressPart}`;
    })
        .join('\n');
    yield ctx.replyWithHTML((msgs.header[language] || msgs.header.en) + responseMessage +
        (msgs.footer[language] || msgs.footer.en));
});
exports.locationHandler = locationHandler;
