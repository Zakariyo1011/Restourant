"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainKeyboard = exports.BUTTONS = void 0;
const telegraf_1 = require("telegraf");
exports.BUTTONS = {
    SHARE_LOCATION: '📍 Joylashuv yuborish',
    HELP: '❓ Yordam',
    ABOUT: 'ℹ️ Bot haqida',
    MENU: '📋 Menyu',
};
const mainKeyboard = () => {
    return telegraf_1.Markup.keyboard([
        [telegraf_1.Markup.button.locationRequest(exports.BUTTONS.SHARE_LOCATION)],
        [exports.BUTTONS.HELP, exports.BUTTONS.ABOUT],
    ])
        .resize()
        .persistent();
};
exports.mainKeyboard = mainKeyboard;
