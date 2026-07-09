import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import axios from 'axios';
import { config } from '../../config';
import { Language } from '../../types';

export const languageHandler = async (ctx: Context) => {
    try {
        const response = await axios.get<{ languages: Language[] }>(
            `${config.API_BASE_URL}/languages`
        );

        const languages = response.data.languages;

        const keyboard = Markup.inlineKeyboard(
            languages.map((lang) => [
                Markup.button.callback(
                    `${lang.flag} ${lang.name}`,
                    `lang_${lang.code}`
                ),
            ])
        );

        return ctx.reply('🌐 Tilni tanlang / Select Language:', keyboard);
    } catch (error) {
        console.error('Error fetching languages:', error);
        return ctx.reply('❌ Error loading languages. Please try again.');
    }
};

export const handleLanguageSelection = async (ctx: Context) => {
    const match = ctx.callbackQuery?.data?.match(/^lang_(.+)$/);
    if (!match) return;

    const languageCode = match[1];

    // Store language in session/context
    const userId = ctx.from?.id.toString();
    if (userId) {
        // You can store this in Redis, database, or just in context
        ctx.session = ctx.session || {};
        (ctx.session as any).language = languageCode;
    }

    const messages = {
        en: '✅ English selected',
        ru: '✅ Русский выбран',
        uz: '✅ O\'zbek tanlandi',
        kk: '✅ Қазақша таңдалды',
        ky: '✅ Кыргызча тандалды',
        tg: '✅ Тоҷикӣ танбор шуд',
        tr: '✅ Türkçe seçildi',
    };

    await ctx.editMessageText(
        messages[languageCode as keyof typeof messages] || '✅ Language selected'
    );

    // Show food type selection
    await foodTypeHandler(ctx, languageCode);
};

export const foodTypeHandler = async (ctx: Context, languageCode?: string) => {
    try {
        const lang = languageCode || ((ctx.session as any)?.language || 'en');

        const response = await axios.get(
            `${config.API_BASE_URL}/food-types/${lang}`
        );

        const foodTypes = response.data.food_types || [];

        const keyboard = Markup.inlineKeyboard(
            foodTypes.map((food: any) => [
                Markup.button.callback(food.name, `food_${food.slug}`),
            ])
        );

        const messages = {
            en: '🍽️ Select food type:',
            ru: '🍽️ Выберите тип кухни:',
            uz: '🍽️ Ovqat turini tanlang:',
            kk: '🍽️ Тағам түрін таңдаңыз:',
            ky: '🍽️ Тамактын түрүн тандаңыз:',
            tg: '🍽️ Навъи хӯрок интихоб кунед:',
            tr: '🍽️ Yemek türünü seçin:',
        };

        if (ctx.callbackQuery) {
            await ctx.editMessageText(
                messages[lang as keyof typeof messages] || '🍽️ Select food type:',
                keyboard
            );
        } else {
            await ctx.reply(
                messages[lang as keyof typeof messages] || '🍽️ Select food type:',
                keyboard
            );
        }
    } catch (error) {
        console.error('Error fetching food types:', error);
        return ctx.reply('❌ Error loading food types. Please try again.');
    }
};

export const handleFoodTypeSelection = async (ctx: Context) => {
    const match = ctx.callbackQuery?.data?.match(/^food_(.+)$/);
    if (!match) return;

    const foodType = match[1];

    // Store food type in session
    const userId = ctx.from?.id.toString();
    if (userId) {
        ctx.session = ctx.session || {};
        (ctx.session as any).foodType = foodType;
    }

    const lang = ((ctx.session as any)?.language || 'en') as string;

    const messages = {
        en: '✅ Food type selected. Now share your location to find restaurants.',
        ru: '✅ Тип кухни выбран. Теперь поделитесь своим местоположением.',
        uz: '✅ Ovqat turi tanlandi. Endi joylashuvingizni ulashing.',
        kk: '✅ Тағам түрі таңдалды. Енді орналасқан жерін бөлісіңіз.',
        ky: '✅ Тамак түрү тандалды. Эми жайгашкан жерин багы.',
        tg: '✅ Навъи хӯрок интихоб шуд. Ҳоло мамлакати худро ба куллам бугузорӣ кунед.',
        tr: '✅ Yemek türü seçildi. Şimdi konumunuzu paylaşın.',
    };

    await ctx.editMessageText(
        messages[lang as keyof typeof messages] ||
            'Food type selected. Share your location.'
    );
};
