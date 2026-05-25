// Enhanced Notification Service for MESSOB Fleet Management
import { toast } from 'sonner';

class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.serviceWorkerRegistration = null;
    this.subscriptions = new Map();
  }

  // Initialize the notification service
  async initialize() {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered for notifications');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Request permission if not granted
    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission === 'granted';
  }

  // Show browser notification
  showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      // Fallback to toast notification
      toast(title, {
        description: options.body,
        duration: options.duration || 5000,
      });
      return;
    }

    const defaultOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options
    };

    if (this.serviceWorkerRegistration) {
      // Use service worker for better control
      this.serviceWorkerRegistration.showNotification(title, defaultOptions);
    } else {
      // Fallback to basic notification
      new Notification(title, defaultOptions);
    }
  }

  // Trip-related notifications
  notifyTripApproved(tripData) {
    this.showNotification('Trip Approved! 🚗', {
      body: `Your trip to ${tripData.destination} has been approved. Vehicle: ${tripData.vehicle}`,
      icon: '/icon-192.png',
      tag: `trip-approved-${tripData.id}`,
      data: { type: 'trip_approved', tripId: tripData.id },
      actions: [
        { action: 'view', title: 'View Trip', icon: '/icon-192.png' },
        { action: 'track', title: 'Track Vehicle', icon: '/icon-192.png' }
      ]
    });
  }

  notifyTripRejected(tripData) {
    this.showNotification('Trip Request Rejected', {
      body: `Your trip request to ${tripData.destination} was not approved. Reason: ${tripData.reason || 'Not specified'}`,
      icon: '/icon-192.png',
      tag: `trip-rejected-${tripData.id}`,
      data: { type: 'trip_rejected', tripId: tripData.id }
    });
  }

  notifyTripAssigned(tripData) {
    this.showNotification('New Trip Assignment 🚙', {
      body: `Trip to ${tripData.destination} assigned. Pickup: ${tripData.pickup}`,
      icon: '/icon-192.png',
      tag: `trip-assigned-${tripData.id}`,
      data: { type: 'trip_assigned', tripId: tripData.id },
      actions: [
        { action: 'accept', title: 'Accept', icon: '/icon-192.png' },
        { action: 'view', title: 'View Details', icon: '/icon-192.png' }
      ],
      requireInteraction: true
    });
  }

  notifyTripStarted(tripData) {
    this.showNotification('Trip Started 🛣️', {
      body: `Driver has started the trip to ${tripData.destination}`,
      icon: '/icon-192.png',
      tag: `trip-started-${tripData.id}`,
      data: { type: 'trip_started', tripId: tripData.id },
      actions: [
        { action: 'track', title: 'Track Live', icon: '/icon-192.png' }
      ]
    });
  }

  notifyTripCompleted(tripData) {
    this.showNotification('Trip Completed ✅', {
      body: `Your trip to ${tripData.destination} has been completed successfully`,
      icon: '/icon-192.png',
      tag: `trip-completed-${tripData.id}`,
      data: { type: 'trip_completed', tripId: tripData.id }
    });
  }

  // Maintenance notifications
  notifyMaintenanceAlert(alertData) {
    this.showNotification('Maintenance Alert ⚠️', {
      body: `${alertData.vehicle}: ${alertData.message}`,
      icon: '/icon-192.png',
      tag: `maintenance-${alertData.vehicleId}`,
      data: { type: 'maintenance_alert', vehicleId: alertData.vehicleId },
      actions: [
        { action: 'view', title: 'View Details', icon: '/icon-192.png' },
        { action: 'schedule', title: 'Schedule Service', icon: '/icon-192.png' }
      ]
    });
  }

  notifyMaintenanceOverdue(alertData) {
    this.showNotification('Maintenance Overdue! 🚨', {
      body: `${alertData.vehicle} maintenance is overdue by ${alertData.overdueDays} days`,
      icon: '/icon-192.png',
      tag: `maintenance-overdue-${alertData.vehicleId}`,
      data: { type: 'maintenance_overdue', vehicleId: alertData.vehicleId },
      requireInteraction: true
    });
  }

  // Fuel notifications
  notifyLowFuelEfficiency(vehicleData) {
    this.showNotification('Low Fuel Efficiency ⛽', {
      body: `${vehicleData.plate}: ${vehicleData.efficiency} km/L (below ${vehicleData.threshold} km/L)`,
      icon: '/icon-192.png',
      tag: `fuel-efficiency-${vehicleData.id}`,
      data: { type: 'fuel_efficiency', vehicleId: vehicleData.id }
    });
  }

  notifyHighFuelCost(vehicleData) {
    this.showNotification('High Fuel Cost 💰', {
      body: `${vehicleData.plate}: $${vehicleData.costPerKm}/km (above threshold)`,
      icon: '/icon-192.png',
      tag: `fuel-cost-${vehicleData.id}`,
      data: { type: 'fuel_cost', vehicleId: vehicleData.id }
    });
  }

  // GPS and tracking notifications
  notifyVehicleOffline(vehicleData) {
    this.showNotification('Vehicle Offline 📡', {
      body: `${vehicleData.plate} has been offline for ${vehicleData.duration}`,
      icon: '/icon-192.png',
      tag: `vehicle-offline-${vehicleData.id}`,
      data: { type: 'vehicle_offline', vehicleId: vehicleData.id }
    });
  }

  notifyGeofenceViolation(alertData) {
    this.showNotification('Geofence Alert 🚨', {
      body: `${alertData.vehicle} ${alertData.type} ${alertData.geofence}`,
      icon: '/icon-192.png',
      tag: `geofence-${alertData.vehicleId}`,
      data: { type: 'geofence_violation', vehicleId: alertData.vehicleId },
      requireInteraction: true
    });
  }

  notifySpeedViolation(alertData) {
    this.showNotification('Speed Violation ⚡', {
      body: `${alertData.vehicle} exceeding speed limit: ${alertData.speed} km/h`,
      icon: '/icon-192.png',
      tag: `speed-${alertData.vehicleId}`,
      data: { type: 'speed_violation', vehicleId: alertData.vehicleId }
    });
  }

  // System notifications
  notifySystemAlert(alertData) {
    this.showNotification('System Alert 🔔', {
      body: alertData.message,
      icon: '/icon-192.png',
      tag: `system-${alertData.id}`,
      data: { type: 'system_alert', alertId: alertData.id }
    });
  }

  // Emergency notifications
  notifyEmergency(emergencyData) {
    this.showNotification('EMERGENCY ALERT 🚨', {
      body: `${emergencyData.vehicle}: ${emergencyData.message}`,
      icon: '/icon-192.png',
      tag: `emergency-${emergencyData.vehicleId}`,
      data: { type: 'emergency', vehicleId: emergencyData.vehicleId },
      requireInteraction: true,
      vibrate: [500, 200, 500, 200, 500],
      actions: [
        { action: 'call', title: 'Call Driver', icon: '/icon-192.png' },
        { action: 'locate', title: 'Locate Vehicle', icon: '/icon-192.png' }
      ]
    });
  }

  // Batch notifications for multiple events
  notifyBatch(notifications) {
    if (notifications.length === 1) {
      const notif = notifications[0];
      this.showNotification(notif.title, notif.options);
      return;
    }

    this.showNotification(`${notifications.length} New Notifications`, {
      body: notifications.map(n => n.title).join(', '),
      icon: '/icon-192.png',
      tag: 'batch-notifications',
      data: { type: 'batch', notifications },
      actions: [
        { action: 'view_all', title: 'View All', icon: '/icon-192.png' }
      ]
    });
  }

  // Subscribe to notification types
  subscribe(type, callback) {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, new Set());
    }
    this.subscriptions.get(type).add(callback);
  }

  // Unsubscribe from notification types
  unsubscribe(type, callback) {
    if (this.subscriptions.has(type)) {
      this.subscriptions.get(type).delete(callback);
    }
  }

  // Trigger subscribed callbacks
  trigger(type, data) {
    if (this.subscriptions.has(type)) {
      this.subscriptions.get(type).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Notification callback error:', error);
        }
      });
    }
  }

  // Clear all notifications with a specific tag
  clearNotifications(tag) {
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.getNotifications({ tag }).then(notifications => {
        notifications.forEach(notification => notification.close());
      });
    }
  }

  // Get notification permission status
  getPermissionStatus() {
    return this.permission;
  }

  // Check if notifications are supported
  isNotificationSupported() {
    return this.isSupported;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Auto-initialize when imported
notificationService.initialize().then(success => {
  if (success) {
    console.log('Notification service initialized successfully');
  } else {
    console.warn('Notification service initialization failed');
  }
});

export default notificationService;

// Export individual notification methods for convenience
export const {
  showNotification,
  notifyTripApproved,
  notifyTripRejected,
  notifyTripAssigned,
  notifyTripStarted,
  notifyTripCompleted,
  notifyMaintenanceAlert,
  notifyMaintenanceOverdue,
  notifyLowFuelEfficiency,
  notifyHighFuelCost,
  notifyVehicleOffline,
  notifyGeofenceViolation,
  notifySpeedViolation,
  notifySystemAlert,
  notifyEmergency,
  subscribe,
  unsubscribe
} = notificationService;