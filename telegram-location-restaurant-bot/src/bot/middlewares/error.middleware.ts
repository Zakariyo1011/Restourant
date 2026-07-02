import { Context } from 'telegraf';

export const errorMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
    try {
        await next();
    } catch (error) {
        console.error('Error occurred:', error);
        await ctx.reply('Something went wrong. Please try again later.');
    }
};