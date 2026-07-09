import { Context } from 'telegraf';
import { getNearbyRestaurants } from '../../services/restaurant.service';
import { Location } from '../../types';

interface SessionContext extends Context {
    session?: {
        language?: string;
        foodType?: string;
    };
}

const getMessages = (language: string) => ({
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

export const locationHandler = async (ctx: SessionContext) => {
    const message = ctx.message as { location?: Location } | undefined;
    const location = message?.location;
    const language = (ctx.session?.language || 'en') as string;
    const foodType = (ctx.session?.foodType || '') as string;
    const msgs = getMessages(language);

    if (!location) {
        await ctx.reply(msgs.requesting[language as keyof typeof msgs.requesting] || msgs.requesting.en);
        return;
    }

    let nearbyRestaurants = [];

    try {
        nearbyRestaurants = await getNearbyRestaurants(location);
        
        // Filter by food type if selected
        if (foodType) {
            nearbyRestaurants = nearbyRestaurants.filter((r: any) => 
                r.cuisine_type && r.cuisine_type.toLowerCase().includes(foodType.toLowerCase())
            );
        }
    } catch (error) {
        console.error('Nearby restaurants fetch failed:', error);
        await ctx.reply(msgs.fetchError[language as keyof typeof msgs.fetchError] || msgs.fetchError.en);
        return;
    }

    if (nearbyRestaurants.length === 0) {
        await ctx.reply(msgs.notFound[language as keyof typeof msgs.notFound] || msgs.notFound.en);
        return;
    }

    const responseMessage = nearbyRestaurants
        .map((restaurant: any, index) => {
            const addressPart = restaurant.address ? `\n   📍 ${restaurant.address}` : '';
            return `${index + 1}) ${restaurant.name} — ${restaurant.distance.toFixed(1)} km${addressPart}`;
        })
        .join('\n');

    await ctx.replyWithHTML(
        (msgs.header[language as keyof typeof msgs.header] || msgs.header.en) + responseMessage +
        (msgs.footer[language as keyof typeof msgs.footer] || msgs.footer.en),
    );
};
