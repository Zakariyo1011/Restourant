import { config } from './config';
import bot from './bot';

if (!config.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is required. Please set it in your environment variables.');
}

const startBot = async () => {
    try {
        if (config.USE_WEBHOOK) {
            if (!config.WEBHOOK_DOMAIN) {
                throw new Error('WEBHOOK_DOMAIN is required when USE_WEBHOOK=true.');
            }

            await bot.launch({
                webhook: {
                    domain: config.WEBHOOK_DOMAIN,
                    hookPath: config.WEBHOOK_PATH,
                    port: config.PORT,
                },
            });

            console.log(`Bot is running in webhook mode on ${config.WEBHOOK_DOMAIN}${config.WEBHOOK_PATH}`);
            return;
        }

        await bot.launch();
        console.log('Bot is running in polling mode.');
    } catch (err) {
        console.error('Failed to launch the bot:', err);
        process.exit(1);
    }
};

startBot();