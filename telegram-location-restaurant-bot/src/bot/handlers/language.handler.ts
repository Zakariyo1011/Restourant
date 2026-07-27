import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import axios from 'axios';
import { config } from '../../config';
import { Language } from '../../types';
import { mainKeyboard } from '../keyboards/main.keyboard';

interface SessionContext extends Context {
    session?: {
        language?: string;
        foodType?: string;
        awaitingCustomFoodType?: boolean;
    };
}

const CUISINE_PRESETS = [
    {
        key: 'uzbek',
        callback: 'foodpreset_uzbek',
        filter: 'uzbek|o\'zbek|uzbek cuisine|osh|plov|palov',
        labels: {
            en: 'Uzbek food',
            ru: 'Узбекская кухня',
            uz: 'O\'zbek taomlari',
            kk: 'Өзбек тағамдары',
            ky: 'Өзбек тамактары',
            tg: 'Таомҳои ӯзбекӣ',
            tr: 'Özbek mutfağı',
        },
    },
    {
        key: 'kazakh',
        callback: 'foodpreset_kazakh',
        filter: 'kazakh|qazaq|қазақ|kazakh cuisine|beshbarmak',
        labels: {
            en: 'Kazakh food',
            ru: 'Казахская кухня',
            uz: 'Qozoq taomlari',
            kk: 'Қазақ тағамдары',
            ky: 'Казак тамактары',
            tg: 'Таомҳои қазоқӣ',
            tr: 'Kazak mutfağı',
        },
    },
    {
        key: 'tajik',
        callback: 'foodpreset_tajik',
        filter: 'tajik|tojik|таджик|tajik cuisine|qurutob',
        labels: {
            en: 'Tajik food',
            ru: 'Таджикская кухня',
            uz: 'Tojik taomlari',
            kk: 'Тәжік тағамдары',
            ky: 'Тажик тамактары',
            tg: 'Таомҳои тоҷикӣ',
            tr: 'Tacik mutfağı',
        },
    },
    {
        key: 'kyrgyz',
        callback: 'foodpreset_kyrgyz',
        filter: 'kyrgyz|кыргыз|qirg\'iz|kyrgyz cuisine',
        labels: {
            en: 'Kyrgyz food',
            ru: 'Кыргызская кухня',
            uz: 'Qirg\'iz taomlari',
            kk: 'Қырғыз тағамдары',
            ky: 'Кыргыз тамактары',
            tg: 'Таомҳои қирғизӣ',
            tr: 'Kırgız mutfağı',
        },
    },
    {
        key: 'turkish',
        callback: 'foodpreset_turkish',
        filter: 'turkish|türk|turk|turkish cuisine|kebab',
        labels: {
            en: 'Turkish food',
            ru: 'Турецкая кухня',
            uz: 'Turk taomlari',
            kk: 'Түрік тағамдары',
            ky: 'Түрк тамактары',
            tg: 'Таомҳои туркӣ',
            tr: 'Türk mutfağı',
        },
    },
    {
        key: 'turkmen',
        callback: 'foodpreset_turkmen',
        filter: 'turkmen|türkmen|turkman|turkmen cuisine|dograma',
        labels: {
            en: 'Turkmen food',
            ru: 'Туркменская кухня',
            uz: 'Turkman taomlari',
            kk: 'Түрікмен тағамдары',
            ky: 'Түркмөн тамактары',
            tg: 'Таомҳои туркманӣ',
            tr: 'Türkmen mutfağı',
        },
    },
] as const;

// Dish-based food types to exclude from API results (these are specific dishes, not cuisines)
const EXCLUDED_DISH_SLUGS = [
    'pizza', 'burger', 'sushi', 'shawarma', 'shaurma', 'plov', 'kebab',
    'noodles', 'bakery', 'laghman', 'manti', 'hotdog', 'hot-dog',
    'sandwich', 'doner', 'fries', 'wok', 'pasta',
];

const ensureSession = (ctx: SessionContext) => {
    ctx.session ??= {};
    return ctx.session;
};

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

        return ctx.reply('Tilni tanlang / Select language:', keyboard);
    } catch (error) {
        console.error('Error fetching languages:', error);
        return ctx.reply('❌ Error loading languages. Please try again.');
    }
};

export const handleLanguageSelection = async (ctx: SessionContext) => {
    try {
        await ctx.answerCbQuery().catch(() => undefined);

        const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
        const match = typeof callbackData === 'string' ? callbackData.match(/^lang_(.+)$/) : null;
        
        if (!match) return;

        const languageCode = match[1];
        ensureSession(ctx).language = languageCode;

        const flagMap: Record<string, string> = {
            en: '🇬🇧', ru: '🇷🇺', uz: '🇺🇿', kk: '🇰🇿',
            ky: '🇰🇬', tg: '🇹🇯', tr: '🇹🇷',
        };
        const nameMap: Record<string, string> = {
            en: 'English', ru: 'Русский', uz: "O'zbek",
            kk: 'Қазақ', ky: 'Кыргыз', tg: 'Тоҷикӣ', tr: 'Türkçe',
        };
        const flag = flagMap[languageCode] || '';
        const name = nameMap[languageCode] || languageCode;

        // Update inline message to show selected language
        await ctx.editMessageText(`${flag} ${name}`);

        // Send new keyboard
        await ctx.reply(`${flag} ${name}`, mainKeyboard(languageCode));

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

        ensureSession(ctx).awaitingCustomFoodType = false;

        const response = await axios.get(
            `${config.API_BASE_URL}/food-types/${lang}`
        );

        const foodTypes = response.data.food_types || [];

        // Filter out specific dish types, keep only cuisine categories
        const filteredFoodTypes = foodTypes.filter((food: any) => {
            const slug = (food.slug || '').toLowerCase().trim();
            const name = (food.name || '').toLowerCase().trim();
            return !EXCLUDED_DISH_SLUGS.some(
                (excluded) => slug === excluded || slug.includes(excluded) || name === excluded
            );
        });

        const apiRows = filteredFoodTypes.map((food: any) => [
            Markup.button.callback(food.name, `food_${food.slug}`),
        ]);

        const presetRows = CUISINE_PRESETS.map((preset) => [
            Markup.button.callback(
                preset.labels[lang as keyof typeof preset.labels] || preset.labels.en,
                preset.callback,
            ),
        ]);

        const keyboard = Markup.inlineKeyboard([
            ...apiRows,
            ...presetRows,
        ]);

        const messages: Record<string, string> = {
            en: 'Select food type:',
            ru: 'Выберите тип кухни:',
            uz: 'Ovqat turini tanlang:',
            kk: 'Тағам түрін таңдаңыз:',
            ky: 'Тамактын түрүн тандаңыз:',
            tg: 'Навъи хӯрокро интихоб кунед:',
            tr: 'Yemek türünü seçin:',
        };

        if (ctx.callbackQuery) {
            await ctx.editMessageText(
                messages[lang] || 'Select food type:',
                keyboard
            );
        } else {
            await ctx.reply(
                messages[lang] || 'Select food type:',
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
        await ctx.answerCbQuery().catch(() => undefined);

        const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
        const foodMatch = typeof callbackData === 'string' ? callbackData.match(/^food_(.+)$/) : null;
        const presetMatch = typeof callbackData === 'string' ? callbackData.match(/^foodpreset_(.+)$/) : null;
        
        if (!foodMatch && !presetMatch) return;

        const session = ensureSession(ctx);
        const lang = ctx.session?.language || 'en';

        let selectedLabel = '';

        if (foodMatch) {
            session.foodType = foodMatch[1];
            session.awaitingCustomFoodType = false;
            selectedLabel = foodMatch[1];
        }

        if (presetMatch) {
            const selectedPreset = CUISINE_PRESETS.find((preset) => preset.key === presetMatch[1]);
            if (selectedPreset) {
                session.foodType = selectedPreset.filter;
                session.awaitingCustomFoodType = false;
                selectedLabel = selectedPreset.labels[lang as keyof typeof selectedPreset.labels] || selectedPreset.labels.en;
            }
        }

        // Edit inline message to show what was selected
        await ctx.editMessageText(selectedLabel || 'Selected').catch(() => undefined);

        // Send confirmation with location request button
        const locationLabels: Record<string, string> = {
            en: 'Share location', ru: 'Отправить локацию',
            uz: 'Joylashuv yuborish', kk: 'Орналасқан жерді жіберу',
            ky: 'Жайгашкан жерди жөнөтүү', tg: 'Ирсоли ҷойгиршавӣ',
            tr: 'Konum gönder',
        };
        const confirmLabels: Record<string, string> = {
            en: `${selectedLabel} selected. Share your location:`,
            ru: `${selectedLabel} выбрано. Поделитесь локацией:`,
            uz: `${selectedLabel} tanlandi. Joylashuvingizni yuboring:`,
            kk: `${selectedLabel} таңдалды. Орналасқан жерді жіберіңіз:`,
            ky: `${selectedLabel} тандалды. Жайгашкан жерди жөнөтүңүз:`,
            tg: `${selectedLabel} интихоб шуд. Ҷойгиршавиро ирсол кунед:`,
            tr: `${selectedLabel} seçildi. Konumunuzu gönderin:`,
        };

        await ctx.reply(
            confirmLabels[lang] || `${selectedLabel} selected. Share your location:`,
            Markup.keyboard([
                [Markup.button.locationRequest(locationLabels[lang] || 'Share location')],
            ]).resize().oneTime(),
        );
    } catch (error) {
        console.error('Error in food type selection:', error);
        await ctx.reply('❌ Error. Please try again.');
    }
};


