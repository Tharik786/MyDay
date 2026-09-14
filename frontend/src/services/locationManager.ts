import * as Location from 'expo-location';
import { Task } from '../types';
import * as Notifications from 'expo-notifications';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  name?: string;
}

class LocationManager {
  private isWatching: boolean = false;
  private watchSubscription: Location.LocationSubscription | null = null;
  private locationTasks: Task[] = [];
  private triggeredTasks: Set<number> = new Set();

  /**
   * Requests location permission ONLY when this method is invoked.
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn('Error requesting location permissions:', err);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Retrieves user's current GPS position and reverse geocoded place name.
   */
  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    const hasPerm = await this.requestPermission();
    if (!hasPerm) return null;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (places && places.length > 0) {
          const p = places[0];
          coords.name = [p.name || p.street, p.subregion || p.city].filter(Boolean).join(', ') || 'Current Location';
        }
      } catch (e) {
        coords.name = 'Current Location';
      }

      return coords;
    } catch (err) {
      console.warn('Failed to get current location:', err);
      return null;
    }
  }

  /**
   * Distance calculation between two points in meters (Haversine).
   */
  getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Syncs active location-based tasks and starts background/foreground watcher if needed.
   */
  async updateLocationTasks(tasks: Task[]) {
    this.locationTasks = tasks.filter(
      (t) => t.is_location_based && t.status === 'ACTIVE' && t.location_lat != null && t.location_lng != null
    );

    if (this.locationTasks.length > 0 && !this.isWatching) {
      await this.startWatching();
    } else if (this.locationTasks.length === 0 && this.isWatching) {
      this.stopWatching();
    }
  }

  private async startWatching() {
    const hasPerm = await this.checkPermission();
    if (!hasPerm) return;

    try {
      this.isWatching = true;
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50, // Check every 50 meters
          timeInterval: 15000,   // or every 15 seconds
        },
        (loc) => {
          this.checkProximity(loc.coords.latitude, loc.coords.longitude);
        }
      );
    } catch (e) {
      console.warn('Could not start location watch:', e);
      this.isWatching = false;
    }
  }

  private stopWatching() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    this.isWatching = false;
  }

  private async checkProximity(currLat: number, currLng: number) {
    for (const task of this.locationTasks) {
      if (this.triggeredTasks.has(task.id)) continue;
      if (task.location_lat == null || task.location_lng == null) continue;

      const dist = this.getDistanceMeters(
        currLat,
        currLng,
        task.location_lat,
        task.location_lng
      );
      const radius = task.location_radius || 200;
      const isInside = dist <= radius;
      const triggerCondition = task.location_trigger || 'ENTER';

      if ((triggerCondition === 'ENTER' && isInside) || (triggerCondition === 'EXIT' && !isInside && dist <= radius * 2.5)) {
        this.triggeredTasks.add(task.id);
        
        // Trigger location reminder notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📍 Location Alert: ${task.title}`,
            body: `${triggerCondition === 'ENTER' ? 'Arrived at' : 'Left'} ${task.location_name || 'destination'}. ${task.description || ''}`.trim(),
            data: {
              taskId: task.id,
              type: task.reminder_mode === 'ALARM' ? 'TASK_ALARM' : 'TASK_REMINDER',
              title: task.title,
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            categoryIdentifier: task.reminder_mode === 'ALARM' ? 'TASK_ALARM_CATEGORY' : undefined,
          },
          trigger: null, // trigger immediately!
        }).catch(console.warn);
      }
    }
  }
}

export const locationManager = new LocationManager();
