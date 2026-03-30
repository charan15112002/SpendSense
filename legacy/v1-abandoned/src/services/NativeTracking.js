import { NativeModules, Platform } from 'react-native';

const NativeTrackingModule = NativeModules.SpendSenseTracking;

function parseArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export class NativeTracking {
  static isAvailable() {
    return Platform.OS === 'android' && Boolean(NativeTrackingModule);
  }

  static async consumePendingEvents() {
    if (!this.isAvailable()) {
      return { smsEvents: [], notificationEvents: [] };
    }

    const result = await NativeTrackingModule.consumePendingEvents();
    return {
      smsEvents: parseArray(result?.smsEventsJson),
      notificationEvents: parseArray(result?.notificationEventsJson),
    };
  }

  static async isNotificationAccessEnabled() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return Boolean(await NativeTrackingModule.isNotificationAccessEnabled());
    } catch (_) {
      return false;
    }
  }

  static async openNotificationAccessSettings() {
    if (!this.isAvailable()) {
      return false;
    }

    return NativeTrackingModule.openNotificationAccessSettings();
  }
}
