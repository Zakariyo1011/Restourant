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
bot.on('text', (ctx) => ctx.reply('Iltimos, pastdagi tugmalardan foydalaning yoki /language buyrug\'ini ishlating.', (0, main_keyboard_1.mainKeyboard)()));
exports.default = bot;
