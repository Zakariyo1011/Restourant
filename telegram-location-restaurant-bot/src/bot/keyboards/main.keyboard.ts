import { Markup } from 'telegraf';

type MenuKey = 'SHARE_LOCATION' | 'SELECT_LANGUAGE' | 'SELECT_FOOD_TYPE';

const BUTTON_LABELS: Record<MenuKey, Record<string, string>> = {
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

export const getButtonLabel = (key: MenuKey, language: string) =>
    BUTTON_LABELS[key][language] || BUTTON_LABELS[key].en;

export const getAllButtonLabels = (key: MenuKey) =>
    Object.values(BUTTON_LABELS[key]);

export const BUTTONS = {
    SHARE_LOCATION: getAllButtonLabels('SHARE_LOCATION'),
    SELECT_LANGUAGE: getAllButtonLabels('SELECT_LANGUAGE'),
    SELECT_FOOD_TYPE: getAllButtonLabels('SELECT_FOOD_TYPE'),
};

export const mainKeyboard = (language = 'en') => {
    const selectLanguage = getButtonLabel('SELECT_LANGUAGE', language);
    const selectFoodType = getButtonLabel('SELECT_FOOD_TYPE', language);
    const shareLocation = getButtonLabel('SHARE_LOCATION', language);

    return Markup.keyboard([
        [selectLanguage],
        [selectFoodType],
        [Markup.button.locationRequest(shareLocation)],
    ])
        .resize()
        .persistent();
};