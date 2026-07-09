import { Markup } from 'telegraf';

export const BUTTONS = {
    SHARE_LOCATION: '📍 Joylashuv yuborish',
    SELECT_LANGUAGE: '🌐 Til tanlash',
    SELECT_FOOD_TYPE: '🍽️ Ovqat turi',
};

export const mainKeyboard = () => {
    return Markup.keyboard([
        [BUTTONS.SELECT_LANGUAGE],
        [BUTTONS.SELECT_FOOD_TYPE],
        [Markup.button.locationRequest(BUTTONS.SHARE_LOCATION)],
    ])
        .resize()
        .persistent();
};