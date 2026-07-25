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
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHandler = void 0;
const main_keyboard_1 = require("../keyboards/main.keyboard");
const language_handler_1 = require("./language.handler");
const startHandler = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const messages = {
        en: 'Welcome to Restaurant Finder!\n\n1. Select your language\n2. Choose food type\n3. Share your location\n4. Get nearby restaurants!',
        ru: 'Добро пожаловать в Restaurant Finder!\n\n1. Выберите язык\n2. Выберите тип кухни\n3. Поделитесь местоположением\n4. Получите ближайшие рестораны!',
        uz: 'Restaurant Finder-ga xush kelibsiz!\n\n1. Tilni tanlang\n2. Ovqat turini tanlang\n3. Joylashuvingizni ulashing\n4. Yaqin restoranlarni oling!',
        kk: 'Restaurant Finder-ге қош келдіңіз!\n\n1. Тіл таңдаңыз\n2. Тағам түрін таңдаңыз\n3. Орналасқан жерін бөлісіңіз\n4. Жақын ресторандарды табыңыз!',
        ky: 'Restaurant Finder-ге кош келдиңиз!\n\n1. Тил тандаңыз\n2. Тамак түрүн тандаңыз\n3. Жайгашкан жериңизди бөлүшүңүз\n4. Жакын ресторандарды табыңыз!',
        tg: 'Ба Restaurant Finder хуш омадед!\n\n1. Забонро интихоб кунед\n2. Навъи хӯрокро интихоб кунед\n3. Ҷойгиршавии худро ирсол кунед\n4. Рестораниҳои наздикро пайдо кунед!',
        tr: 'Restaurant Finder\'a hoş geldiniz!\n\n1. Dil seçin\n2. Yemek türünü seçin\n3. Konumunuzu paylaşın\n4. Yakındaki restoranları bulun!',
    };
    yield ctx.replyWithHTML(messages.en, (0, main_keyboard_1.mainKeyboard)());
    // Auto-start language selection
    yield (0, language_handler_1.languageHandler)(ctx);
});
exports.startHandler = startHandler;
