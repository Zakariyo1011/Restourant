import { Markup } from 'telegraf';

export const BUTTONS = {
    SHARE_LOCATION: '📍 Joylashuv yuborish',
    HELP: '❓ Yordam',
    ABOUT: 'ℹ️ Bot haqida',
    MENU: '📋 Menyu',
};

export const mainKeyboard = () => {
    return Markup.keyboard([
        [Markup.button.locationRequest(BUTTONS.SHARE_LOCATION)],
        [BUTTONS.HELP, BUTTONS.ABOUT],
    ])
        .resize()
        .persistent();
};