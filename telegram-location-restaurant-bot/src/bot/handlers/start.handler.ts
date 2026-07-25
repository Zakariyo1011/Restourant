import { Context } from 'telegraf';
import { mainKeyboard } from '../keyboards/main.keyboard';
import { languageHandler } from './language.handler';

export const startHandler = async (ctx: Context) => {
    const messages = {
        en: 'Welcome to Restaurant Finder!\n\n1. Select your language\n2. Choose food type\n3. Share your location\n4. Get nearby restaurants!',
        ru: 'Добро пожаловать в Restaurant Finder!\n\n1. Выберите язык\n2. Выберите тип кухни\n3. Поделитесь местоположением\n4. Получите ближайшие рестораны!',
        uz: 'Restaurant Finder-ga xush kelibsiz!\n\n1. Tilni tanlang\n2. Ovqat turini tanlang\n3. Joylashuvingizni ulashing\n4. Yaqin restoranlarni oling!',
        kk: 'Restaurant Finder-ге қош келдіңіз!\n\n1. Тіл таңдаңыз\n2. Тағам түрін таңдаңыз\n3. Орналасқан жерін бөлісіңіз\n4. Жақын ресторандарды табыңыз!',
        ky: 'Restaurant Finder-ге кош келдиңиз!\n\n1. Тил тандаңыз\n2. Тамак түрүн тандаңыз\n3. Жайгашкан жериңизди бөлүшүңүз\n4. Жакын ресторандарды табыңыз!',
        tg: 'Ба Restaurant Finder хуш омадед!\n\n1. Забонро интихоб кунед\n2. Навъи хӯрокро интихоб кунед\n3. Ҷойгиршавии худро ирсол кунед\n4. Рестораниҳои наздикро пайдо кунед!',
        tr: 'Restaurant Finder\'a hoş geldiniz!\n\n1. Dil seçin\n2. Yemek türünü seçin\n3. Konumunuzu paylaşın\n4. Yakındaki restoranları bulun!',
    };

    await ctx.replyWithHTML(
        messages.en,
        mainKeyboard(),
    );
    
    // Auto-start language selection
    await languageHandler(ctx);
};
