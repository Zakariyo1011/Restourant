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
exports.handleFoodTypeSelection = exports.foodTypeHandler = exports.handleLanguageSelection = exports.languageHandler = void 0;
const telegraf_1 = require("telegraf");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config");
const main_keyboard_1 = require("../keyboards/main.keyboard");
const CUISINE_PRESETS = [
    {
        key: 'uzbek',
        callback: 'foodpreset_uzbek',
        filter: 'uzbek|o\'zbek|milliy|uzbek cuisine|osh|plov|palov|somsa|shashlik|lagman|manti',
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
        filter: 'kazakh|qazaq|қазақ|kazakh cuisine|beshbarmak|baursak|kazy|kuyrdak',
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
        filter: 'tajik|tojik|таджик|tajik cuisine|qurutob|osh|plov|shurbo',
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
        filter: 'kyrgyz|кыргыз|qirg\'iz|kyrgyz cuisine|beshbarmak|manty|lagman',
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
        filter: 'turkish|türk|turk|turkish cuisine|kebab|doner|baklava|lahmacun',
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
        filter: 'turkmen|türkmen|turkman|turkmen cuisine|dograma|ichlekli|chorba',
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
];
// Dish-based food types to exclude from API results (these are specific dishes, not cuisines)
const EXCLUDED_DISH_SLUGS = [
    'pizza', 'burger', 'sushi', 'shawarma', 'shaurma', 'plov', 'kebab',
    'noodles', 'bakery', 'laghman', 'manti', 'hotdog', 'hot-dog',
    'sandwich', 'doner', 'fries', 'wok', 'pasta',
];
const ensureSession = (ctx) => {
    var _a;
    (_a = ctx.session) !== null && _a !== void 0 ? _a : (ctx.session = {});
    return ctx.session;
};
const languageHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get(`${config_1.config.API_BASE_URL}/languages`);
        const languages = response.data.languages;
        const keyboard = telegraf_1.Markup.inlineKeyboard(languages.map((lang) => [
            telegraf_1.Markup.button.callback(`${lang.flag} ${lang.name}`, `lang_${lang.code}`),
        ]));
        return ctx.reply('Tilni tanlang / Select language:', keyboard);
    }
    catch (error) {
        console.error('Error fetching languages:', error);
        return ctx.reply('❌ Error loading languages. Please try again.');
    }
});
exports.languageHandler = languageHandler;
const handleLanguageSelection = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield ctx.answerCbQuery().catch(() => undefined);
        const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
        const match = typeof callbackData === 'string' ? callbackData.match(/^lang_(.+)$/) : null;
        if (!match)
            return;
        const languageCode = match[1];
        ensureSession(ctx).language = languageCode;
        const flagMap = {
            en: '🇬🇧', ru: '🇷🇺', uz: '🇺🇿', kk: '🇰🇿',
            ky: '🇰🇬', tg: '🇹🇯', tr: '🇹🇷',
        };
        const nameMap = {
            en: 'English', ru: 'Русский', uz: "O'zbek",
            kk: 'Қазақ', ky: 'Кыргыз', tg: 'Тоҷикӣ', tr: 'Türkçe',
        };
        const flag = flagMap[languageCode] || '';
        const name = nameMap[languageCode] || languageCode;
        // Update inline message to show selected language
        yield ctx.editMessageText(`${flag} ${name}`);
        // Send new keyboard
        yield ctx.reply(`${flag} ${name}`, (0, main_keyboard_1.mainKeyboard)(languageCode));
        // Show food type selection
        yield (0, exports.foodTypeHandler)(ctx, languageCode);
    }
    catch (error) {
        console.error('Error in language selection:', error);
        yield ctx.reply('❌ Error. Please try again.');
    }
});
exports.handleLanguageSelection = handleLanguageSelection;
const foodTypeHandler = (ctx, languageCode) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const lang = languageCode || ((_a = ctx.session) === null || _a === void 0 ? void 0 : _a.language) || 'en';
        ensureSession(ctx).awaitingCustomFoodType = false;
        const response = yield axios_1.default.get(`${config_1.config.API_BASE_URL}/food-types/${lang}`);
        const foodTypes = response.data.food_types || [];
        // Filter out specific dish types, keep only cuisine categories
        const filteredFoodTypes = foodTypes.filter((food) => {
            const slug = (food.slug || '').toLowerCase().trim();
            const name = (food.name || '').toLowerCase().trim();
            return !EXCLUDED_DISH_SLUGS.some((excluded) => slug === excluded || slug.includes(excluded) || name === excluded);
        });
        const apiRows = filteredFoodTypes.map((food) => [
            telegraf_1.Markup.button.callback(food.name, `food_${food.slug}`),
        ]);
        const presetRows = CUISINE_PRESETS.map((preset) => [
            telegraf_1.Markup.button.callback(preset.labels[lang] || preset.labels.en, preset.callback),
        ]);
        const keyboard = telegraf_1.Markup.inlineKeyboard([
            ...apiRows,
            ...presetRows,
        ]);
        const messages = {
            en: 'Select food type:',
            ru: 'Выберите тип кухни:',
            uz: 'Ovqat turini tanlang:',
            kk: 'Тағам түрін таңдаңыз:',
            ky: 'Тамактын түрүн тандаңыз:',
            tg: 'Навъи хӯрокро интихоб кунед:',
            tr: 'Yemek türünü seçin:',
        };
        if (ctx.callbackQuery) {
            yield ctx.editMessageText(messages[lang] || 'Select food type:', keyboard);
        }
        else {
            yield ctx.reply(messages[lang] || 'Select food type:', keyboard);
        }
    }
    catch (error) {
        console.error('Error fetching food types:', error);
        return ctx.reply('❌ Error loading food types. Please try again.');
    }
});
exports.foodTypeHandler = foodTypeHandler;
const handleFoodTypeSelection = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        yield ctx.answerCbQuery().catch(() => undefined);
        const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
        const foodMatch = typeof callbackData === 'string' ? callbackData.match(/^food_(.+)$/) : null;
        const presetMatch = typeof callbackData === 'string' ? callbackData.match(/^foodpreset_(.+)$/) : null;
        if (!foodMatch && !presetMatch)
            return;
        const session = ensureSession(ctx);
        const lang = ((_a = ctx.session) === null || _a === void 0 ? void 0 : _a.language) || 'en';
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
                selectedLabel = selectedPreset.labels[lang] || selectedPreset.labels.en;
            }
        }
        // Edit inline message to show what was selected
        yield ctx.editMessageText(selectedLabel || 'Selected').catch(() => undefined);
        // Send confirmation with full main keyboard (always visible) + location button
        const locationLabels = {
            en: 'Share location', ru: 'Отправить локацию',
            uz: 'Joylashuv yuborish', kk: 'Орналасқан жерді жіберу',
            ky: 'Жайгашкан жерди жөнөтүү', tg: 'Ирсоли ҷойгиршавӣ',
            tr: 'Konum gönder',
        };
        const confirmLabels = {
            en: `${selectedLabel} selected. Share your location:`,
            ru: `${selectedLabel} выбрано. Поделитесь локацией:`,
            uz: `${selectedLabel} tanlandi. Joylashuvingizni yuboring:`,
            kk: `${selectedLabel} таңдалды. Орналасқан жерді жіберіңіз:`,
            ky: `${selectedLabel} тандалды. Жайгашкан жерди жөнөтүңүз:`,
            tg: `${selectedLabel} интихоб шуд. Ҷойгиршавиро ирсол кунед:`,
            tr: `${selectedLabel} seçildi. Konumunuzu gönderin:`,
        };
        const selectLanguageLabel = { en: 'Choose language', ru: 'Выбрать язык', uz: 'Til tanlash', kk: 'Тілді таңдау', ky: 'Тилди тандоо', tg: 'Интихоби забон', tr: 'Dil seçimi' };
        const selectFoodLabel = { en: 'Food type', ru: 'Тип кухни', uz: 'Ovqat turi', kk: 'Тағам түрі', ky: 'Тамак түрү', tg: 'Навъи хӯрок', tr: 'Yemek türü' };
        yield ctx.reply(confirmLabels[lang] || `${selectedLabel} selected. Share your location:`, telegraf_1.Markup.keyboard([
            [selectLanguageLabel[lang] || selectLanguageLabel.en],
            [selectFoodLabel[lang] || selectFoodLabel.en],
            [telegraf_1.Markup.button.locationRequest(locationLabels[lang] || 'Share location')],
        ]).resize().persistent());
    }
    catch (error) {
        console.error('Error in food type selection:', error);
        yield ctx.reply('❌ Error. Please try again.');
    }
});
exports.handleFoodTypeSelection = handleFoodTypeSelection;
