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
        key: 'international',
        callback: 'foodpreset_international',
        filter: 'international|european|asian|mixed cuisine',
        labels: {
            en: 'International food',
            ru: 'Международная кухня',
            uz: 'Xalqaro taomlar',
            kk: 'Халықаралық тағамдар',
            ky: 'Эл аралык тамактар',
            tg: 'Таомҳои байналмилалӣ',
            tr: 'Uluslararası mutfak',
        },
    },
] as const;

const CUSTOM_INPUT_CALLBACK = 'food_custom_input';

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

        // Store language in session
        ensureSession(ctx).language = languageCode;

        const messages: Record<string, string> = {
            en: 'English selected',
            ru: 'Русский выбран',
            uz: 'O\'zbek tanlandi',
            kk: 'Қазақша таңдалды',
            ky: 'Кыргызча тандалды',
            tg: 'Тоҷикӣ интихоб шуд',
            tr: 'Türkçe seçildi',
        };

        await ctx.editMessageText(
            messages[languageCode] || 'Language selected'
        );

        await ctx.reply(
            messages[languageCode] || 'Language selected',
            mainKeyboard(languageCode),
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

        ensureSession(ctx).awaitingCustomFoodType = false;

        const response = await axios.get(
            `${config.API_BASE_URL}/food-types/${lang}`
        );

        const foodTypes = response.data.food_types || [];

        const apiRows = foodTypes.map((food: any) => [
            Markup.button.callback(food.name, `food_${food.slug}`),
        ]);

        const presetRows = CUISINE_PRESETS.map((preset) => [
            Markup.button.callback(
                preset.labels[lang as keyof typeof preset.labels] || preset.labels.en,
                preset.callback,
            ),
        ]);

        const customInputLabels: Record<string, string> = {
            en: 'Type your own option',
            ru: 'Ввести свой вариант',
            uz: 'O\'zingiz kiriting',
            kk: 'Өзіңіз енгізіңіз',
            ky: 'Өзүңүз жазыңыз',
            tg: 'Худатон ворид кунед',
            tr: 'Kendiniz yazın',
        };

        const keyboard = Markup.inlineKeyboard([
            ...apiRows,
            ...presetRows,
            [
                Markup.button.callback(
                    customInputLabels[lang] || customInputLabels.en,
                    CUSTOM_INPUT_CALLBACK,
                ),
            ],
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

        if (foodMatch) {
            session.foodType = foodMatch[1];
        }

        if (presetMatch) {
            const selectedPreset = CUISINE_PRESETS.find((preset) => preset.key === presetMatch[1]);
            if (selectedPreset) {
                session.foodType = selectedPreset.filter;
            }
        }

        session.awaitingCustomFoodType = false;

        const lang = ctx.session?.language || 'en';

        const messages: Record<string, string> = {
            en: 'Food type selected. Now share your location to find restaurants.',
            ru: 'Тип кухни выбран. Теперь поделитесь своим местоположением.',
            uz: 'Ovqat turi tanlandi. Endi joylashuvingizni ulashing.',
            kk: 'Тағам түрі таңдалды. Енді орналасқан жерін бөлісіңіз.',
            ky: 'Тамак түрү тандалды. Эми жайгашкан жериңизди бөлүшүңүз.',
            tg: 'Навъи хӯрок интихоб шуд. Ҳоло ҷойгиршавии худро ирсол кунед.',
            tr: 'Yemek türü seçildi. Şimdi konumunuzu paylaşın.',
        };

        await ctx.editMessageText(
            messages[lang] || 'Food type selected. Share your location.'
        );
    } catch (error) {
        console.error('Error in food type selection:', error);
        await ctx.reply('❌ Error. Please try again.');
    }
};

export const requestCustomFoodTypeInput = async (ctx: SessionContext) => {
    try {
        await ctx.answerCbQuery().catch(() => undefined);

        ensureSession(ctx).awaitingCustomFoodType = true;

        const lang = ctx.session?.language || 'en';
        const messages: Record<string, string> = {
            en: 'Type food/cuisine name (example: sushi, steak, uzbek food).',
            ru: 'Введите название кухни/блюда (например: sushi, steak, узбекская кухня).',
            uz: 'Ovqat yoki oshxona nomini yozing (masalan: sushi, steak, o\'zbek taomi).',
            kk: 'Тағам немесе асхана атауын жазыңыз (мысалы: sushi, steak, өзбек тағамы).',
            ky: 'Тамак же ашкана атын жазыңыз (мисалы: sushi, steak, өзбек тамагы).',
            tg: 'Номи таом ё навъи ошхонаро нависед (масалан: sushi, steak, таоми ӯзбекӣ).',
            tr: 'Yemek/mutfak adını yazın (örnek: sushi, steak, özbek mutfağı).',
        };

        await ctx.reply(messages[lang] || messages.en);
    } catch (error) {
        console.error('Error requesting custom food type input:', error);
        await ctx.reply('Error. Please try again.');
    }
};

export const handleCustomFoodTypeInput = async (ctx: SessionContext) => {
    const text = (ctx.message && 'text' in ctx.message) ? String(ctx.message.text || '').trim() : '';
    const session = ensureSession(ctx);

    if (!session.awaitingCustomFoodType) {
        return false;
    }

    if (!text) {
        return true;
    }

    session.foodType = text;
    session.awaitingCustomFoodType = false;

    const lang = session.language || 'en';
    const messages: Record<string, string> = {
        en: `Saved: ${text}. Now share your location.`,
        ru: `Сохранено: ${text}. Теперь отправьте локацию.`,
        uz: `Saqlandi: ${text}. Endi joylashuvingizni yuboring.`,
        kk: `Сақталды: ${text}. Енді орналасқан жеріңізді жіберіңіз.`,
        ky: `Сакталды: ${text}. Эми жайгашкан жериңизди жөнөтүңүз.`,
        tg: `Сабт шуд: ${text}. Акнун ҷойгиршавиро ирсол кунед.`,
        tr: `Kaydedildi: ${text}. Şimdi konumunuzu gönderin.`,
    };

    await ctx.reply(messages[lang] || messages.en, mainKeyboard(lang));
    return true;
};
