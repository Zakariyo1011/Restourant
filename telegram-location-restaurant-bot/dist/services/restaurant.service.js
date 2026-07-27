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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyRestaurants = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const distance_util_1 = require("../utils/distance.util");
const getNearbyRestaurants = (userLocation, foodType) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const params = {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        radius: config_1.config.NEARBY_RADIUS_KM,
        limit: config_1.config.NEARBY_LIMIT,
    };
    if (foodType) {
        params.food_type = foodType;
    }
    const response = yield axios_1.default.get(`${config_1.config.API_BASE_URL}/restaurants/nearby`, {
        params,
    });
    const payload = Array.isArray(response.data)
        ? response.data
        : ((_a = response.data.data) !== null && _a !== void 0 ? _a : []);
    const restaurants = payload
        .filter((item) => item.location && typeof item.location.latitude === 'number' && typeof item.location.longitude === 'number')
        .map((item) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const location = {
            latitude: item.location.latitude,
            longitude: item.location.longitude,
            address: (_b = (_a = item.location) === null || _a === void 0 ? void 0 : _a.address) !== null && _b !== void 0 ? _b : null,
        };
        const computedDistance = (0, distance_util_1.calculateDistance)(userLocation.latitude, userLocation.longitude, location.latitude, location.longitude);
        return {
            id: String(item.id),
            name: item.name,
            address: (_e = (_c = item.address) !== null && _c !== void 0 ? _c : (_d = item.location) === null || _d === void 0 ? void 0 : _d.address) !== null && _e !== void 0 ? _e : '',
            location,
            distance: typeof item.distance === 'number' ? item.distance : computedDistance,
            phone: (_f = item.phone) !== null && _f !== void 0 ? _f : undefined,
            website: (_g = item.website) !== null && _g !== void 0 ? _g : null,
            image_url: (_h = item.image_url) !== null && _h !== void 0 ? _h : null,
        };
    })
        .sort((first, second) => first.distance - second.distance)
        .slice(0, config_1.config.NEARBY_LIMIT);
    return restaurants;
});
exports.getNearbyRestaurants = getNearbyRestaurants;
