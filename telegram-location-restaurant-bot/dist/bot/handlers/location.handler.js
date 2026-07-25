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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationHandler = void 0;
const axios_1 = __importDefault(require("axios"));
const restaurant_service_1 = require("../../services/restaurant.service");
const config_1 = require("../../config");
const main_keyboard_1 = require("../keyboards/main.keyboard");
const getMessages = (language) => ({
    requesting: {
        en: 'Please share your location.',
        ru: 'Пожалуйста, поделитесь своим местоположением.',
        uz: 'Iltimos, joylashuvingizni ulashing.',
        kk: 'Орналасқан жерін бөлісіңіз.',
        ky: 'Жайгашкан жеринизди бөлүшүңүз.',
        tg: 'Лутфан ҷойи ояди худро бахш кунед.',
        tr: 'Lütfen konumunuzu paylaşın.',
    },
    fetchError: {
        en: 'Error fetching restaurants. Please try again later.',
        ru: 'Ошибка при получении ресторанов. Попробуйте позже.',
        uz: 'Restoranlarni olishda xatolik. Keyinroq qayta urinib ko\'ring.',
        kk: 'Рестораны алуда қате. Кейінірек қайта көруге тырысыңыз.',
        ky: 'Ресторанды алуу сыноосунда ката. Кийинчерээк кайталап көрүңүз.',
        tg: 'Хатогӣ дар гирифтани рестораниҳо. Дубора кӯшиш кунед.',
        tr: 'Restoranları alırken hata. Lütfen tekrar deneyin.',
    },
    notFound: {
        en: 'No restaurants found nearby.',
        ru: 'Рестораны поблизости не найдены.',
        uz: 'Yaqin atrofda restoran topilmadi.',
        kk: 'Жақын аймақта ресторан табылмады.',
        ky: 'Жакынчасы ресторан табылган жок.',
        tg: 'Рестораниҳо наздик найм нашуданд.',
        tr: 'Yakında restoran bulunamadı.',
    },
    header: {
        en: '<b>Nearby restaurants:</b>\n\n',
        ru: '<b>Рестораны поблизости:</b>\n\n',
        uz: '<b>Yaqin restoranlar:</b>\n\n',
        kk: '<b>Жақын рестораны:</b>\n\n',
        ky: '<b>Жакын рестораны:</b>\n\n',
        tg: '<b>Рестораниҳои наздик:</b>\n\n',
        tr: '<b>Yakındaki restoranlar:</b>\n\n',
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
    caption: {
        distance: {
            en: '<b>Distance:</b>',
            ru: '<b>Расстояние:</b>',
            uz: '<b>Masofa:</b>',
            kk: '<b>Қашықтық:</b>',
            ky: '<b>Аралык:</b>',
            tg: '<b>Масофа:</b>',
            tr: '<b>Mesafe:</b>',
        },
        address: {
            en: '<b>Address:</b>',
            ru: '<b>Адрес:</b>',
            uz: '<b>Manzil:</b>',
            kk: '<b>Мекенжай:</b>',
            ky: '<b>Дарек:</b>',
            tg: '<b>Суроға:</b>',
            tr: '<b>Adres:</b>',
        },
        phone: {
            en: '<b>Phone:</b>',
            ru: '<b>Телефон:</b>',
            uz: '<b>Telefon:</b>',
            kk: '<b>Телефон:</b>',
            ky: '<b>Телефон:</b>',
            tg: '<b>Телефон:</b>',
            tr: '<b>Telefon:</b>',
        },
        map: {
            en: 'View on map',
            ru: 'Открыть на карте',
            uz: 'Xaritada ko\'rish',
            kk: 'Картадан көру',
            ky: 'Картадан көрүү',
            tg: 'Дар харита дидан',
            tr: 'Haritada görüntüle',
        },
    },
});
const resolveImageUrl = (value) => {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const apiOrigin = config_1.config.API_BASE_URL.replace(/\/api\/?$/, '');
    const publicAssetOrigin = (config_1.config.PUBLIC_ASSET_BASE_URL || apiOrigin).replace(/\/$/, '');
    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            const isLoopbackHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
            if (!isLoopbackHost) {
                return trimmed;
            }
            return `${publicAssetOrigin}${parsed.pathname}${parsed.search}`;
        }
        catch (_a) {
            return trimmed;
        }
    }
    const clean = trimmed.replace(/^\/+/, '');
    return clean.startsWith('storage/')
        ? `${publicAssetOrigin}/${clean}`
        : `${publicAssetOrigin}/storage/${clean}`;
};
const isLoopbackUrl = (value) => {
    try {
        const parsed = new URL(value);
        return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
    }
    catch (_a) {
        return false;
    }
};
const buildPhotoInput = (imageUrl, restaurantName) => __awaiter(void 0, void 0, void 0, function* () {
    if (!isLoopbackUrl(imageUrl)) {
        return imageUrl;
    }
    const response = yield axios_1.default.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
    });
    const safeName = restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'restaurant';
    return {
        source: Buffer.from(response.data),
        filename: `${safeName}.jpg`,
    };
});
const buildRestaurantCaption = (restaurant, index, language, msgs) => {
    const distanceLabel = msgs.caption.distance[language] || msgs.caption.distance.en;
    const addressLabel = msgs.caption.address[language] || msgs.caption.address.en;
    const phoneLabel = msgs.caption.phone[language] || msgs.caption.phone.en;
    const mapLabel = msgs.caption.map[language] || msgs.caption.map.en;
    const addressPart = restaurant.address ? `\n${addressLabel} ${restaurant.address}` : '';
    const phonePart = restaurant.phone ? `\n${phoneLabel} ${restaurant.phone}` : '';
    const searchQuery = [restaurant.name, restaurant.address]
        .filter(Boolean)
        .join(', ')
        .trim();
    const mapsUrl = searchQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`
        : `https://www.google.com/maps/search/?api=1&query=${restaurant.location.latitude},${restaurant.location.longitude}`;
    return `${index + 1}) <b>${restaurant.name}</b>\n${distanceLabel} ${restaurant.distance.toFixed(1)} km${addressPart}${phonePart}\n<a href="${mapsUrl}">${mapLabel}</a>`;
};
const normalizeFoodTypeText = (value) => value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const matchesFoodType = (restaurant, foodType) => {
    const haystack = normalizeFoodTypeText([
        restaurant.name,
        restaurant.address,
        restaurant.cuisine_type,
        restaurant.website,
    ]
        .filter(Boolean)
        .join(' '));
    const needle = normalizeFoodTypeText(foodType);
    if (!needle || !haystack) {
        return false;
    }
    return haystack.includes(needle);
};
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
        if (foodType) {
            const matchedRestaurants = nearbyRestaurants.filter((restaurant) => matchesFoodType(restaurant, foodType));
            if (matchedRestaurants.length > 0) {
                nearbyRestaurants = matchedRestaurants;
            }
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
    const restaurantsWithImages = nearbyRestaurants
        .map((restaurant) => (Object.assign(Object.assign({}, restaurant), { imageUrl: resolveImageUrl(restaurant.image_url) })))
        .filter((restaurant) => restaurant.imageUrl);
    if (restaurantsWithImages.length === 0) {
        yield ctx.replyWithHTML((msgs.header[language] || msgs.header.en) +
            nearbyRestaurants
                .map((restaurant, index) => {
                const addressPart = restaurant.address ? `\n   ${restaurant.address}` : '';
                return `${index + 1}) ${restaurant.name} — ${restaurant.distance.toFixed(1)} km${addressPart}`;
            })
                .join('\n') +
            (msgs.footer[language] || msgs.footer.en));
        return;
    }
    for (let index = 0; index < Math.min(5, restaurantsWithImages.length); index += 1) {
        const restaurant = restaurantsWithImages[index];
        const replyOptions = Object.assign({ caption: buildRestaurantCaption(restaurant, index, language, msgs), parse_mode: 'HTML' }, ((index === Math.min(5, restaurantsWithImages.length) - 1)
            ? { reply_markup: (0, main_keyboard_1.mainKeyboard)(language).reply_markup }
            : {}));
        try {
            const photoInput = yield buildPhotoInput(restaurant.imageUrl, restaurant.name);
            yield ctx.replyWithPhoto(photoInput, replyOptions);
        }
        catch (error) {
            console.error(`Failed to send photo for restaurant ${restaurant.name}:`, error);
            yield ctx.replyWithHTML(replyOptions.caption, index === Math.min(5, restaurantsWithImages.length) - 1
                ? { reply_markup: (0, main_keyboard_1.mainKeyboard)(language).reply_markup, parse_mode: 'HTML' }
                : { parse_mode: 'HTML' });
        }
    }
});
exports.locationHandler = locationHandler;
