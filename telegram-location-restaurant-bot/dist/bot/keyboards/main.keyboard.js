"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainKeyboard = exports.BUTTONS = void 0;
const telegraf_1 = require("telegraf");
exports.BUTTONS = {
    SHARE_LOCATION: '📍 Joylashuv yuborish',
    SELECT_LANGUAGE: '🌐 Til tanlash',
    SELECT_FOOD_TYPE: '🍽️ Ovqat turi',
};
const mainKeyboard = () => {
    return telegraf_1.Markup.keyboard([
        [exports.BUTTONS.SELECT_LANGUAGE],
        [exports.BUTTONS.SELECT_FOOD_TYPE],
        [telegraf_1.Markup.button.locationRequest(exports.BUTTONS.SHARE_LOCATION)],
    ])
        .resize()
        .persistent();
};
exports.mainKeyboard = mainKeyboard;
