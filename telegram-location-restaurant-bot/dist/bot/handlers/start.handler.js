"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHandler = void 0;
const main_keyboard_1 = require("../keyboards/main.keyboard");
const startHandler = (ctx) => {
    return ctx.replyWithHTML('🍽️ <b>Restoran Finder botiga xush kelibsiz!</b>\n\n' +
        'Yaqiningizdagi eng yaxshi restoranlarni topib beraman.\n\n' +
        '1) Pastdagi <b>📍 Joylashuv yuborish</b> tugmasini bosing\n' +
        '2) Joylashuvingizni yuboring\n' +
        '3) Sizga eng yaqin <b>5 ta restoran</b> ro‘yxatini chiqaraman ✅', (0, main_keyboard_1.mainKeyboard)());
};
exports.startHandler = startHandler;
