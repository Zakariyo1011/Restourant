import { Telegraf, session } from 'telegraf';
import { startHandler } from './handlers/start.handler';
import { locationHandler } from './handlers/location.handler';
import {
	languageHandler,
	handleLanguageSelection,
	foodTypeHandler,
	handleFoodTypeSelection,
	requestCustomFoodTypeInput,
	handleCustomFoodTypeInput,
} from './handlers/language.handler';
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
bot.action(/^foodpreset_/, handleFoodTypeSelection);
bot.action('food_custom_input', requestCustomFoodTypeInput);

bot.on('text', async (ctx) => {
	const handledCustomInput = await handleCustomFoodTypeInput(ctx as any);
	if (handledCustomInput) {
		return;
	}

	return ctx.reply(
		({
			en: 'Please use the buttons below or use /language command.',
			ru: 'Пожалуйста, используйте кнопки ниже или команду /language.',
			uz: 'Iltimos, pastdagi tugmalardan foydalaning yoki /language buyrug\'ini ishlating.',
			kk: 'Төмендегі батырмаларды пайдаланыңыз немесе /language командасын қолданыңыз.',
			ky: 'Төмөнкү баскычтарды колдонуңуз же /language буйругун жазыңыз.',
			tg: 'Лутфан тугмаҳои поёнро истифода баред ё фармони /language-ро нависед.',
			tr: 'Lütfen aşağıdaki butonları kullanın veya /language komutunu yazın.',
		} as Record<string, string>)[(ctx as any).session?.language || 'en'] ||
			'Please use the buttons below or use /language command.',
		mainKeyboard((ctx as any).session?.language || 'en'),
	);
});

export default bot;
