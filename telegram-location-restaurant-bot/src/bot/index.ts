import { Telegraf, session } from 'telegraf';
import { startHandler } from './handlers/start.handler';
import { locationHandler } from './handlers/location.handler';
import { languageHandler, handleLanguageSelection, foodTypeHandler, handleFoodTypeSelection } from './handlers/language.handler';
import { BUTTONS, mainKeyboard } from './keyboards/main.keyboard';
import { errorMiddleware } from './middlewares/error.middleware';
import { config } from '../config';

if (!config.BOT_TOKEN) {
	throw new Error('BOT_TOKEN is required. Please set it in your environment variables.');
}

const bot = new Telegraf(config.BOT_TOKEN);

// Session middleware for storing user data
bot.use(session());
bot.use(errorMiddleware);

bot.start(startHandler);
bot.on('location', locationHandler);

// Language selection
bot.command('language', languageHandler);
bot.hears(BUTTONS.SELECT_LANGUAGE, languageHandler);
bot.action(/^lang_/, handleLanguageSelection);

// Food type selection
bot.hears(BUTTONS.SELECT_FOOD_TYPE, (ctx) => foodTypeHandler(ctx));
bot.action(/^food_/, handleFoodTypeSelection);

bot.on('text', (ctx) =>
	ctx.reply(
		'Iltimos, pastdagi tugmalardan foydalaning yoki /language buyrug\'ini ishlating.',
		mainKeyboard(),
	),
);

export default bot;
