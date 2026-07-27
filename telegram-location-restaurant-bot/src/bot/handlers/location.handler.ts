import { Context } from 'telegraf';
import axios from 'axios';
import { getNearbyRestaurants } from '../../services/restaurant.service';
import { Location } from '../../types';
import { config } from '../../config';
import { mainKeyboard } from '../keyboards/main.keyboard';

interface SessionContext extends Context {
    session?: {
        language?: string;
        foodType?: string;
        awaitingCustomFoodType?: boolean;
    };
}

const getMessages = (language: string) => ({
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

const resolveImageUrl = (value?: string | null) => {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    const apiOrigin = config.API_BASE_URL.replace(/\/api\/?$/, '');
    const publicAssetOrigin = (config.PUBLIC_ASSET_BASE_URL || apiOrigin).replace(/\/$/, '');

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            const isLoopbackHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);

            if (!isLoopbackHost) {
                return trimmed;
            }

            return `${publicAssetOrigin}${parsed.pathname}${parsed.search}`;
        } catch {
            return trimmed;
        }
    }

    const clean = trimmed.replace(/^\/+/, '');

    return clean.startsWith('storage/')
        ? `${publicAssetOrigin}/${clean}`
        : `${publicAssetOrigin}/storage/${clean}`;
};

const isLoopbackUrl = (value: string) => {
    try {
        const parsed = new URL(value);
        return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
    } catch {
        return false;
    }
};

const buildPhotoInput = async (imageUrl: string, restaurantName: string) => {
    if (!isLoopbackUrl(imageUrl)) {
        return imageUrl;
    }

    const response = await axios.get<ArrayBuffer>(imageUrl, {
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
};

const buildRestaurantCaption = (restaurant: any, index: number, language: string, msgs: ReturnType<typeof getMessages>) => {
    const distanceLabel = msgs.caption.distance[language as keyof typeof msgs.caption.distance] || msgs.caption.distance.en;
    const addressLabel = msgs.caption.address[language as keyof typeof msgs.caption.address] || msgs.caption.address.en;
    const phoneLabel = msgs.caption.phone[language as keyof typeof msgs.caption.phone] || msgs.caption.phone.en;
    const mapLabel = msgs.caption.map[language as keyof typeof msgs.caption.map] || msgs.caption.map.en;
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

const normalizeFoodTypeText = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const matchesFoodType = (restaurant: any, foodType: string) => {
    if (!foodType || !String(foodType).trim()) {
        return true; // No filter = show all
    }

    const restaurantText = normalizeFoodTypeText([
        restaurant.name || '',
        restaurant.address || '',
        restaurant.cuisine_type || '',
        restaurant.website || '',
    ]
        .filter(Boolean)
        .join(' '));

    if (!restaurantText) {
        return true; // No restaurant text to match against
    }

    // Split by pipe (|) for preset filters or by comma for multi-term filters
    const filterTerms = String(foodType)
        .toLowerCase()
        .split(/[|,]/)
        .map((t) => normalizeFoodTypeText(t.trim()))
        .filter((t) => t && t.length >= 2);

    if (filterTerms.length === 0) {
        return true; // No valid filter terms
    }

    // Split restaurant text into words for word-by-word matching
    const restaurantWords = restaurantText.split(/\s+/).filter(Boolean);

    // At least ONE filter term should match
    return filterTerms.some((term) => {
        if (!term || term.length < 2) return false;

        // Try to match this term against restaurant words
        return restaurantWords.some((word) => {
            // Exact match (highest priority)
            if (word === term) {
                return true;
            }

            // Substring match for longer terms (4+ chars) to avoid false positives
            // e.g., "pizza" matches "pizzeria" or "pizza-house"
            if (term.length >= 4 && word.includes(term)) {
                return true;
            }

            // Prefix match for medium terms (3+ chars)
            // e.g., "chi" matches "chinese" only if term is "chi" and word is "chinese"
            if (term.length >= 3 && word.startsWith(term)) {
                return true;
            }

            return false;
        });
    });
};

export const locationHandler = async (ctx: SessionContext) => {
    const message = ctx.message as { location?: Location } | undefined;
    const location = message?.location;
    const language = (ctx.session?.language || 'en') as string;
    const foodType = (ctx.session?.foodType || '') as string;
    const msgs = getMessages(language);

    if (!location) {
        await ctx.reply(
            msgs.requesting[language as keyof typeof msgs.requesting] || msgs.requesting.en,
            mainKeyboard(language),
        );
        return;
    }

    let nearbyRestaurants = [];

    try {
        nearbyRestaurants = await getNearbyRestaurants(location, foodType || undefined);

        if (foodType) {
            const matchedRestaurants = nearbyRestaurants.filter((restaurant: any) => matchesFoodType(restaurant, foodType));
            if (matchedRestaurants.length > 0) {
                nearbyRestaurants = matchedRestaurants;
            }
        }
    } catch (error) {
        console.error('Nearby restaurants fetch failed:', error);
        await ctx.reply(
            msgs.fetchError[language as keyof typeof msgs.fetchError] || msgs.fetchError.en,
            mainKeyboard(language),
        );
        return;
    }

    if (nearbyRestaurants.length === 0) {
        await ctx.reply(
            msgs.notFound[language as keyof typeof msgs.notFound] || msgs.notFound.en,
            mainKeyboard(language),
        );
        return;
    }

    const restaurantsWithImages = nearbyRestaurants
        .map((restaurant: any) => ({
            ...restaurant,
            imageUrl: resolveImageUrl(restaurant.image_url),
        }))
        .filter((restaurant: any) => restaurant.imageUrl);

    if (restaurantsWithImages.length === 0) {
        await ctx.replyWithHTML(
            (msgs.header[language as keyof typeof msgs.header] || msgs.header.en) +
            nearbyRestaurants
                .map((restaurant: any, index) => {
                    const addressPart = restaurant.address ? `\n   ${restaurant.address}` : '';
                    return `${index + 1}) ${restaurant.name} — ${restaurant.distance.toFixed(1)} km${addressPart}`;
                })
                .join('\n') +
            (msgs.footer[language as keyof typeof msgs.footer] || msgs.footer.en),
            { reply_markup: mainKeyboard(language).reply_markup },
        );
        return;
    }

    for (let index = 0; index < Math.min(5, restaurantsWithImages.length); index += 1) {
        const restaurant = restaurantsWithImages[index];
        const replyOptions = {
            caption: buildRestaurantCaption(restaurant, index, language, msgs),
            parse_mode: 'HTML' as const,
            ...((index === Math.min(5, restaurantsWithImages.length) - 1)
                ? { reply_markup: mainKeyboard(language).reply_markup }
                : {}),
        };

        try {
            const photoInput = await buildPhotoInput(restaurant.imageUrl, restaurant.name);
            await ctx.replyWithPhoto(photoInput, replyOptions);
        } catch (error) {
            console.error(`Failed to send photo for restaurant ${restaurant.name}:`, error);
            await ctx.replyWithHTML(replyOptions.caption, index === Math.min(5, restaurantsWithImages.length) - 1
                ? { reply_markup: mainKeyboard(language).reply_markup, parse_mode: 'HTML' }
                : { parse_mode: 'HTML' });
        }
    }
};
