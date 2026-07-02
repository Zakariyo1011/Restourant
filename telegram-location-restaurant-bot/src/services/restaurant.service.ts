import axios from 'axios';
import { config } from '../config';
import { Location, Restaurant } from '../types';
import { calculateDistance } from '../utils/distance.util';

type RestaurantApiResponse = Array<{
    id: number | string;
    name: string;
    address?: string | null;
    distance?: number;
    location?: {
        latitude: number;
        longitude: number;
        address?: string | null;
    } | null;
}>;

type NearbyApiEnvelope = {
    data?: RestaurantApiResponse;
};

export const getNearbyRestaurants = async (userLocation: Location): Promise<Restaurant[]> => {
    const response = await axios.get<RestaurantApiResponse | NearbyApiEnvelope>(`${config.API_BASE_URL}/restaurants/nearby`, {
        params: {
            lat: userLocation.latitude,
            lng: userLocation.longitude,
            radius: config.NEARBY_RADIUS_KM,
            limit: config.NEARBY_LIMIT,
        },
    });

    const payload = Array.isArray(response.data)
        ? response.data
        : (response.data.data ?? []);

    const restaurants = payload
        .filter((item) => item.location && typeof item.location.latitude === 'number' && typeof item.location.longitude === 'number')
        .map((item) => {
            const location = {
                latitude: item.location!.latitude,
                longitude: item.location!.longitude,
                address: item.location?.address ?? null,
            };

            const computedDistance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                location.latitude,
                location.longitude,
            );

            return {
                id: String(item.id),
                name: item.name,
                address: item.address ?? item.location?.address ?? '',
                location,
                distance: typeof item.distance === 'number' ? item.distance : computedDistance,
            } as Restaurant;
        })
        .sort((first, second) => first.distance - second.distance)
        .slice(0, config.NEARBY_LIMIT);

    return restaurants;
};