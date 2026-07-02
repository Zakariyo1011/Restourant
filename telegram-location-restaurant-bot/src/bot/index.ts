import { Telegraf } from 'telegraf';
import { startHandler } from './handlers/start.handler';
import { locationHandler } from './handlers/location.handler';
import { BUTTONS, mainKeyboard } from './keyboards/main.keyboard';
import { errorMiddleware } from './middlewares/error.middleware';
import { config } from '../config';

if (!config.BOT_TOKEN) {
	throw new Error('BOT_TOKEN is required. Please set it in your environment variables.');
}

const bot = new Telegraf(config.BOT_TOKEN);

bot.use(errorMiddleware);
bot.start(startHandler);
bot.on('location', locationHandler);
bot.command('menu', (ctx) => ctx.reply('📋 Asosiy menyu:', mainKeyboard()));
bot.command('help', (ctx) =>
	ctx.replyWithHTML(
		'❓ <b>Yordam</b>\n\n' +
		'• <b>📍 Joylashuv yuborish</b> tugmasini bosing\n' +
		'• Joylashuvingizni yuboring\n' +
		'• Men sizga eng yaqin 5 ta restoran ro‘yxatini chiqaraman',
		mainKeyboard(),
	),
);
bot.command('about', (ctx) =>
	ctx.replyWithHTML(
		'ℹ️ <b>Bot haqida</b>\n\n' +
		'Ushbu bot siz yuborgan joylashuv asosida restoranlarni masofa bo‘yicha topadi.\n' +
		'Ma’lumotlar sizning restoran tizimingiz API dan olinadi.',
		mainKeyboard(),
	),
);

bot.hears(BUTTONS.MENU, (ctx) => ctx.reply('📋 Asosiy menyu:', mainKeyboard()));
bot.hears(BUTTONS.HELP, (ctx) =>
	ctx.replyWithHTML(
		'❓ <b>Yordam</b>\n\n' +
		'Joylashuvingizni yuboring, men sizga yaqin 5 ta restoran topib beraman.',
		mainKeyboard(),
	),
);
bot.hears(BUTTONS.ABOUT, (ctx) =>
	ctx.replyWithHTML(
		'ℹ️ <b>Bot haqida</b>\n\n' +
		'Restoranlarni masofa bo‘yicha saralab ko‘rsatadigan yordamchi bot.',
		mainKeyboard(),
	),
);

bot.on('text', (ctx) =>
	ctx.reply(
		'Iltimos, pastdagi 📍 tugma orqali joylashuvingizni yuboring yoki ❓ Yordam ni bosing.',
		mainKeyboard(),
	),
);

export default bot;