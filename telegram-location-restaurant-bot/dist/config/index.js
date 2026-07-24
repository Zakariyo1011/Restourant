"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    BOT_TOKEN: process.env.BOT_TOKEN || '',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8000/api',
    PUBLIC_ASSET_BASE_URL: process.env.PUBLIC_ASSET_BASE_URL || '',
    NEARBY_RADIUS_KM: Number(process.env.NEARBY_RADIUS_KM || 50),
    NEARBY_LIMIT: Number(process.env.NEARBY_LIMIT || 5),
    USE_WEBHOOK: (process.env.USE_WEBHOOK || 'false').toLowerCase() === 'true',
    WEBHOOK_DOMAIN: process.env.WEBHOOK_DOMAIN || '',
    WEBHOOK_PATH: process.env.WEBHOOK_PATH || '/telegram/webhook',
    PORT: Number(process.env.PORT || 3000),
};
