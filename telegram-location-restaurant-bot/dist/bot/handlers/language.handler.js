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
        return ctx.reply('🌐 Tilni tanlang / Select Language:', keyboard);
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
            en: '✅ English selected',
            ru: '✅ Русский выбран',
            uz: '✅ O\'zbek tanlandi',
            kk: '✅ Қазақша таңдалды',
            ky: '✅ Кыргызча тандалды',
            tg: '✅ Тоҷикӣ танбор шуд',
            tr: '✅ Türkçe seçildi',
        };
        yield ctx.editMessageText(messages[languageCode] || '✅ Language selected');
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
        const response = yield axios_1.default.get(`${config_1.config.API_BASE_URL}/food-types/${lang}`);
        const foodTypes = response.data.food_types || [];
        const keyboard = telegraf_1.Markup.inlineKeyboard(foodTypes.map((food) => [
            telegraf_1.Markup.button.callback(food.name, `food_${food.slug}`),
        ]));
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
            yield ctx.editMessageText(messages[lang] || '🍽️ Select food type:', keyboard);
        }
        else {
            yield ctx.reply(messages[lang] || '🍽️ Select food type:', keyboard);
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
        const match = typeof callbackData === 'string' ? callbackData.match(/^food_(.+)$/) : null;
        if (!match)
            return;
        const foodType = match[1];
        // Store food type in session
        ensureSession(ctx).foodType = foodType;
        const lang = ((_a = ctx.session) === null || _a === void 0 ? void 0 : _a.language) || 'en';
        const messages = {
            en: '✅ Food type selected. Now share your location to find restaurants.',
            ru: '✅ Тип кухни выбран. Теперь поделитесь своим местоположением.',
            uz: '✅ Ovqat turi tanlandi. Endi joylashuvingizni ulashing.',
            kk: '✅ Тағам түрі таңдалды. Енді орналасқан жерін бөлісіңіз.',
            ky: '✅ Тамак түрү тандалды. Эми жайгашкан жерин багы.',
            tg: '✅ Навъи хӯрок интихоб шуд. Ҳоло мамлакати худро ба куллам бугузорӣ кунед.',
            tr: '✅ Yemek türü seçildi. Şimdi konumunuzu paylaşın.',
        };
        yield ctx.editMessageText(messages[lang] || 'Food type selected. Share your location.');
    }
    catch (error) {
        console.error('Error in food type selection:', error);
        yield ctx.reply('❌ Error. Please try again.');
    }
});
exports.handleFoodTypeSelection = handleFoodTypeSelection;
