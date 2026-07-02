import dotenv from 'dotenv';

dotenv.config();

export const config = {
    BOT_TOKEN: process.env.BOT_TOKEN || '',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8000/api',
    NEARBY_RADIUS_KM: Number(process.env.NEARBY_RADIUS_KM || 50),
    NEARBY_LIMIT: Number(process.env.NEARBY_LIMIT || 5),
    USE_WEBHOOK: (process.env.USE_WEBHOOK || 'false').toLowerCase() === 'true',
    WEBHOOK_DOMAIN: process.env.WEBHOOK_DOMAIN || '',
    WEBHOOK_PATH: process.env.WEBHOOK_PATH || '/telegram/webhook',
    PORT: Number(process.env.PORT || 3000),
};