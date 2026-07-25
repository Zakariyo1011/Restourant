"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainKeyboard = exports.BUTTONS = exports.getAllButtonLabels = exports.getButtonLabel = void 0;
const telegraf_1 = require("telegraf");
const BUTTON_LABELS = {
    SELECT_LANGUAGE: {
        en: 'Choose language',
        ru: 'Выбрать язык',
        uz: 'Til tanlash',
        kk: 'Тілді таңдау',
        ky: 'Тилди тандоо',
        tg: 'Интихоби забон',
        tr: 'Dil seçimi',
    },
    SELECT_FOOD_TYPE: {
        en: 'Food type',
        ru: 'Тип кухни',
        uz: 'Ovqat turi',
        kk: 'Тағам түрі',
        ky: 'Тамак түрү',
        tg: 'Навъи хӯрок',
        tr: 'Yemek türü',
    },
    SHARE_LOCATION: {
        en: 'Share location',
        ru: 'Отправить локацию',
        uz: 'Joylashuv yuborish',
        kk: 'Орналасқан жерді жіберу',
        ky: 'Жайгашкан жерди жөнөтүү',
        tg: 'Ирсоли ҷойгиршавӣ',
        tr: 'Konum gönder',
    },
};
const getButtonLabel = (key, language) => BUTTON_LABELS[key][language] || BUTTON_LABELS[key].en;
exports.getButtonLabel = getButtonLabel;
const getAllButtonLabels = (key) => Object.values(BUTTON_LABELS[key]);
exports.getAllButtonLabels = getAllButtonLabels;
exports.BUTTONS = {
    SHARE_LOCATION: (0, exports.getAllButtonLabels)('SHARE_LOCATION'),
    SELECT_LANGUAGE: (0, exports.getAllButtonLabels)('SELECT_LANGUAGE'),
    SELECT_FOOD_TYPE: (0, exports.getAllButtonLabels)('SELECT_FOOD_TYPE'),
};
const mainKeyboard = (language = 'en') => {
    const selectLanguage = (0, exports.getButtonLabel)('SELECT_LANGUAGE', language);
    const selectFoodType = (0, exports.getButtonLabel)('SELECT_FOOD_TYPE', language);
    const shareLocation = (0, exports.getButtonLabel)('SHARE_LOCATION', language);
    return telegraf_1.Markup.keyboard([
        [selectLanguage],
        [selectFoodType],
        [telegraf_1.Markup.button.locationRequest(shareLocation)],
    ])
        .resize()
        .persistent();
};
exports.mainKeyboard = mainKeyboard;
