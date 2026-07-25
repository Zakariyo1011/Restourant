"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const start_handler_1 = require("./handlers/start.handler");
const location_handler_1 = require("./handlers/location.handler");
const language_handler_1 = require("./handlers/language.handler");
const main_keyboard_1 = require("./keyboards/main.keyboard");
const error_middleware_1 = require("./middlewares/error.middleware");
const config_1 = require("../config");
if (!config_1.config.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is required. Please set it in your environment variables.');
}
const bot = new telegraf_1.Telegraf(config_1.config.BOT_TOKEN);
// Session middleware for storing user data
bot.use((0, telegraf_1.session)());
bot.use(error_middleware_1.errorMiddleware);
bot.start(start_handler_1.startHandler);
bot.on('location', location_handler_1.locationHandler);
// Language selection
bot.command('language', language_handler_1.languageHandler);
bot.hears(main_keyboard_1.BUTTONS.SELECT_LANGUAGE, language_handler_1.languageHandler);
bot.action(/^lang_/, language_handler_1.handleLanguageSelection);
// Food type selection
bot.hears(main_keyboard_1.BUTTONS.SELECT_FOOD_TYPE, (ctx) => (0, language_handler_1.foodTypeHandler)(ctx));
bot.action(/^food_/, language_handler_1.handleFoodTypeSelection);
bot.on('text', (ctx) => {
    var _a, _b;
    return ctx.reply({
        en: 'Please use the buttons below or use /language command.',
        ru: 'Пожалуйста, используйте кнопки ниже или команду /language.',
        uz: 'Iltimos, pastdagi tugmalardan foydalaning yoki /language buyrug\'ini ishlating.',
        kk: 'Төмендегі батырмаларды пайдаланыңыз немесе /language командасын қолданыңыз.',
        ky: 'Төмөнкү баскычтарды колдонуңуз же /language буйругун жазыңыз.',
        tg: 'Лутфан тугмаҳои поёнро истифода баред ё фармони /language-ро нависед.',
        tr: 'Lütfen aşağıdaki butonları kullanın veya /language komutunu yazın.',
    }[((_a = ctx.session) === null || _a === void 0 ? void 0 : _a.language) || 'en'] ||
        'Please use the buttons below or use /language command.', (0, main_keyboard_1.mainKeyboard)(((_b = ctx.session) === null || _b === void 0 ? void 0 : _b.language) || 'en'));
});
exports.default = bot;
