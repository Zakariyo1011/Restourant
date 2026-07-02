import { Context } from 'telegraf';
import { mainKeyboard } from '../keyboards/main.keyboard';

export const startHandler = (ctx: Context) => {
    return ctx.replyWithHTML(
        '🍽️ <b>Restoran Finder botiga xush kelibsiz!</b>\n\n' +
        'Yaqiningizdagi eng yaxshi restoranlarni topib beraman.\n\n' +
        '1) Pastdagi <b>📍 Joylashuv yuborish</b> tugmasini bosing\n' +
        '2) Joylashuvingizni yuboring\n' +
        '3) Sizga eng yaqin <b>5 ta restoran</b> ro‘yxatini chiqaraman ✅',
        mainKeyboard(),
    );
};