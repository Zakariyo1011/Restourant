import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import axios from 'axios';
import { config } from '../../config';
import { Language } from '../../types';

interface SessionContext extends Context {
    session?: {
        language?: string;
        foodType?: string;
    };
}

export const languageHandler = async (ctx: SessionContext) => {
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

export const handleLanguageSelection = async (ctx: SessionContext) => {
    try {
        const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
        const match = typeof callbackData === 'string' ? callbackData.match(/^lang_(.+)$/) : null;
        
        if (!match) return;

        const languageCode = match[1];

        // Store language in session
        if (ctx.session) {
            ctx.session.language = languageCode;
        }

        const messages: Record<string, string> = {
            en: '✅ English selected',
            ru: '✅ Русский выбран',
            uz: '✅ O\'zbek tanlandi',
            kk: '✅ Қазақша таңдалды',
            ky: '✅ Кыргызча тандалды',
            tg: '✅ Тоҷикӣ танбор шуд',
            tr: '✅ Türkçe seçildi',
        };

        await ctx.editMessageText(
            messages[languageCode] || '✅ Language selected'
        );

        // Show food type selection
        await foodTypeHandler(ctx, languageCode);
    } catch (error) {
        console.error('Error in language selection:', error);
        await ctx.reply('❌ Error. Please try again.');
    }
};

export const foodTypeHandler = async (ctx: SessionContext, languageCode?: string) => {
    try {
        const lang = languageCode || ctx.session?.language || 'en';

        const response = await axios.get(
            `${config.API_BASE_URL}/food-types/${lang}`
        );

        const foodTypes = response.data.food_types || [];

        const keyboard = Markup.inlineKeyboard(
            foodTypes.map((food: any) => [
                Markup.button.callback(food.name, `food_${food.slug}`),
            ])
        );

        const messages: Record<string, string> = {
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
                messages[lang] || '🍽️ Select food type:',
                keyboard
            );
        } else {
            await ctx.reply(
                messages[lang] || '🍽️ Select food type:',
                keyboard
            );
        }
    } catch (error) {
        console.error('Error fetching food types:', error);
        return ctx.reply('❌ Error loading food types. Please try again.');
    }
};

export const handleFoodTypeSelection = async (ctx: SessionContext) => {
    try {
        const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
        const match = typeof callbackData === 'string' ? callbackData.match(/^food_(.+)$/) : null;
        
        if (!match) return;

        const foodType = match[1];

        // Store food type in session
        if (ctx.session) {
            ctx.session.foodType = foodType;
        }

        const lang = ctx.session?.language || 'en';

        const messages: Record<string, string> = {
            en: '✅ Food type selected. Now share your location to find restaurants.',
            ru: '✅ Тип кухни выбран. Теперь поделитесь своим местоположением.',
            uz: '✅ Ovqat turi tanlandi. Endi joylashuvingizni ulashing.',
            kk: '✅ Тағам түрі таңдалды. Енді орналасқан жерін бөлісіңіз.',
            ky: '✅ Тамак түрү тандалды. Эми жайгашкан жерин багы.',
            tg: '✅ Навъи хӯрок интихоб шуд. Ҳоло мамлакати худро ба куллам бугузорӣ кунед.',
            tr: '✅ Yemek türü seçildi. Şimdi konumunuzu paylaşın.',
        };

        await ctx.editMessageText(
            messages[lang] || 'Food type selected. Share your location.'
        );
    } catch (error) {
        console.error('Error in food type selection:', error);
        await ctx.reply('❌ Error. Please try again.');
    }
};
