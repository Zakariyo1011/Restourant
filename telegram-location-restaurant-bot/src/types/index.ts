export interface Location {
    latitude: number;
    longitude: number;
    address?: string | null;
}

export interface Restaurant {
    id: string;
    name: string;
    address: string;
    location: Location;
    distance: number;
    cuisine_type?: string;
}

export interface User {
    id: string;
    firstName: string;
    lastName?: string;
    username?: string;
    location?: Location;
    language?: string;
    foodType?: string;
}

export interface Language {
    code: string;
    name: string;
    native_name: string;
    flag: string;
}

export interface FoodType {
    id: number;
    slug: string;
    name: string;
}

export type LanguageCode = 'en' | 'ru' | 'uz' | 'kk' | 'ky' | 'tg' | 'tr';