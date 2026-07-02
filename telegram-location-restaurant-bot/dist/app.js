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
const config_1 = require("./config");
const bot_1 = __importDefault(require("./bot"));
if (!config_1.config.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is required. Please set it in your environment variables.');
}
const startBot = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (config_1.config.USE_WEBHOOK) {
            if (!config_1.config.WEBHOOK_DOMAIN) {
                throw new Error('WEBHOOK_DOMAIN is required when USE_WEBHOOK=true.');
            }
            yield bot_1.default.launch({
                webhook: {
                    domain: config_1.config.WEBHOOK_DOMAIN,
                    hookPath: config_1.config.WEBHOOK_PATH,
                    port: config_1.config.PORT,
                },
            });
            console.log(`Bot is running in webhook mode on ${config_1.config.WEBHOOK_DOMAIN}${config_1.config.WEBHOOK_PATH}`);
            return;
        }
        yield bot_1.default.launch();
        console.log('Bot is running in polling mode.');
    }
    catch (err) {
        console.error('Failed to launch the bot:', err);
        process.exit(1);
    }
});
startBot();
