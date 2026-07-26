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
exports.handleCustomFoodTypeInput = exports.requestCustomFoodTypeInput = exports.handleFoodTypeSelection = exports.foodTypeHandler = exports.handleLanguageSelection = exports.languageHandler = void 0;
const telegraf_1 = require("telegraf");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../../config");
const main_keyboard_1 = require("../keyboards/main.keyboard");
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
    {
        key: 'italian',
        callback: 'foodpreset_italian',
        filter: 'italian|pizza|pasta|lasagna|risotto',
        labels: {
            en: 'Italian food',
            ru: 'Итальянская кухня',
            uz: 'Italiya taomlari',
            kk: 'Итальян тағамдары',
            ky: 'Италия тамактары',
            tg: 'Таомҳои итолиёвӣ',
            tr: 'İtalyan mutfağı',
        },
    },
    {
        key: 'chinese',
        callback: 'foodpreset_chinese',
        filter: 'chinese|wok|noodles|dumpling|peking|szechuan',
        labels: {
            en: 'Chinese food',
            ru: 'Китайская кухня',
            uz: 'Xitoy taomlari',
            kk: 'Қытай тағамдары',
            ky: 'Кытай тамактары',
            tg: 'Таомҳои чинӣ',
            tr: 'Çin mutfağı',
        },
    },
];
const CUSTOM_INPUT_CALLBACK = 'food_custom_input';
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
        // Store language in session
        ensureSession(ctx).language = languageCode;
        const messages = {
            en: 'English selected',
            ru: 'Русский выбран',
            uz: 'O\'zbek tanlandi',
            kk: 'Қазақша таңдалды',
            ky: 'Кыргызча тандалды',
            tg: 'Тоҷикӣ интихоб шуд',
            tr: 'Türkçe seçildi',
        };
        yield ctx.editMessageText(messages[languageCode] || 'Language selected');
        yield ctx.reply(messages[languageCode] || 'Language selected', (0, main_keyboard_1.mainKeyboard)(languageCode));
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
        const apiRows = foodTypes.map((food) => [
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
        if (foodMatch) {
            session.foodType = foodMatch[1];
            session.awaitingCustomFoodType = false;
        }
        if (presetMatch) {
            const selectedPreset = CUISINE_PRESETS.find((preset) => preset.key === presetMatch[1]);
            if (selectedPreset) {
                session.foodType = selectedPreset.filter;
                session.awaitingCustomFoodType = false;
            }
        }
        const lang = ((_a = ctx.session) === null || _a === void 0 ? void 0 : _a.language) || 'en';
        const messages = {
            en: 'Food type selected. Now share your location to find restaurants.',
            ru: 'Тип кухни выбран. Теперь поделитесь своим местоположением.',
            uz: 'Ovqat turi tanlandi. Endi joylashuvingizni ulashing.',
            kk: 'Тағам түрі таңдалды. Енді орналасқан жерін бөлісіңіз.',
            ky: 'Тамак түрү тандалды. Эми жайгашкан жериңизди бөлүшүңүз.',
            tg: 'Навъи хӯрок интихоб шуд. Ҳоло ҷойгиршавии худро ирсол кунед.',
            tr: 'Yemek türü seçildi. Şimdi konumunuzu paylaşın.',
        };
        yield ctx.editMessageText(messages[lang] || 'Food type selected. Share your location.');
    }
    catch (error) {
        console.error('Error in food type selection:', error);
        yield ctx.reply('❌ Error. Please try again.');
    }
});
exports.handleFoodTypeSelection = handleFoodTypeSelection;
const requestCustomFoodTypeInput = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        yield ctx.answerCbQuery().catch(() => undefined);
        ensureSession(ctx).awaitingCustomFoodType = true;
        const lang = ((_a = ctx.session) === null || _a === void 0 ? void 0 : _a.language) || 'en';
        const messages = {
            en: 'Type food/cuisine name (example: sushi, steak, uzbek food).',
            ru: 'Введите название кухни/блюда (например: sushi, steak, узбекская кухня).',
            uz: 'Ovqat yoki oshxona nomini yozing (masalan: sushi, steak, o\'zbek taomi).',
            kk: 'Тағам немесе асхана атауын жазыңыз (мысалы: sushi, steak, өзбек тағамы).',
            ky: 'Тамак же ашкана атын жазыңыз (мисалы: sushi, steak, өзбек тамагы).',
            tg: 'Номи таом ё навъи ошхонаро нависед (масалан: sushi, steak, таоми ӯзбекӣ).',
            tr: 'Yemek/mutfak adını yazın (örnek: sushi, steak, özbek mutfağı).',
        };
        yield ctx.reply(messages[lang] || messages.en);
    }
    catch (error) {
        console.error('Error requesting custom food type input:', error);
        yield ctx.reply('Error. Please try again.');
    }
});
exports.requestCustomFoodTypeInput = requestCustomFoodTypeInput;
const handleCustomFoodTypeInput = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
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
    const messages = {
        en: `Saved: ${text}. Now share your location.`,
        ru: `Сохранено: ${text}. Теперь отправьте локацию.`,
        uz: `Saqlandi: ${text}. Endi joylashuvingizni yuboring.`,
        kk: `Сақталды: ${text}. Енді орналасқан жеріңізді жіберіңіз.`,
        ky: `Сакталды: ${text}. Эми жайгашкан жериңизди жөнөтүңүз.`,
        tg: `Сабт шуд: ${text}. Акнун ҷойгиршавиро ирсол кунед.`,
        tr: `Kaydedildi: ${text}. Şimdi konumunuzu gönderin.`,
    };
    yield ctx.reply(messages[lang] || messages.en, (0, main_keyboard_1.mainKeyboard)(lang));
    return true;
});
exports.handleCustomFoodTypeInput = handleCustomFoodTypeInput;
