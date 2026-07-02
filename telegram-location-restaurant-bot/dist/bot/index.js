"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const start_handler_1 = require("./handlers/start.handler");
const location_handler_1 = require("./handlers/location.handler");
const main_keyboard_1 = require("./keyboards/main.keyboard");
const error_middleware_1 = require("./middlewares/error.middleware");
const config_1 = require("../config");
if (!config_1.config.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is required. Please set it in your environment variables.');
}
const bot = new telegraf_1.Telegraf(config_1.config.BOT_TOKEN);
bot.use(error_middleware_1.errorMiddleware);
bot.start(start_handler_1.startHandler);
bot.on('location', location_handler_1.locationHandler);
bot.command('menu', (ctx) => ctx.reply('📋 Asosiy menyu:', (0, main_keyboard_1.mainKeyboard)()));
bot.command('help', (ctx) => ctx.replyWithHTML('❓ <b>Yordam</b>\n\n' +
    '• <b>📍 Joylashuv yuborish</b> tugmasini bosing\n' +
    '• Joylashuvingizni yuboring\n' +
    '• Men sizga eng yaqin 5 ta restoran ro‘yxatini chiqaraman', (0, main_keyboard_1.mainKeyboard)()));
bot.command('about', (ctx) => ctx.replyWithHTML('ℹ️ <b>Bot haqida</b>\n\n' +
    'Ushbu bot siz yuborgan joylashuv asosida restoranlarni masofa bo‘yicha topadi.\n' +
    'Ma’lumotlar sizning restoran tizimingiz API dan olinadi.', (0, main_keyboard_1.mainKeyboard)()));
bot.hears(main_keyboard_1.BUTTONS.MENU, (ctx) => ctx.reply('📋 Asosiy menyu:', (0, main_keyboard_1.mainKeyboard)()));
bot.hears(main_keyboard_1.BUTTONS.HELP, (ctx) => ctx.replyWithHTML('❓ <b>Yordam</b>\n\n' +
    'Joylashuvingizni yuboring, men sizga yaqin 5 ta restoran topib beraman.', (0, main_keyboard_1.mainKeyboard)()));
bot.hears(main_keyboard_1.BUTTONS.ABOUT, (ctx) => ctx.replyWithHTML('ℹ️ <b>Bot haqida</b>\n\n' +
    'Restoranlarni masofa bo‘yicha saralab ko‘rsatadigan yordamchi bot.', (0, main_keyboard_1.mainKeyboard)()));
bot.on('text', (ctx) => ctx.reply('Iltimos, pastdagi 📍 tugma orqali joylashuvingizni yuboring yoki ❓ Yordam ni bosing.', (0, main_keyboard_1.mainKeyboard)()));
exports.default = bot;
