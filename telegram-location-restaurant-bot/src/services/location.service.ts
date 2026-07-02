import { Location, Restaurant } from '../types';
import { getNearbyRestaurants } from './restaurant.service';

export class LocationService {
    async findNearestRestaurants(userLocation: Location): Promise<Restaurant[]> {
        return getNearbyRestaurants(userLocation);
    }
}