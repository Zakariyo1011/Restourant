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
}

export interface User {
    id: string;
    firstName: string;
    lastName?: string;
    username?: string;
    location?: Location;
}