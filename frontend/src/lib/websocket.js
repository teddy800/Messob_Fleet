/**
 * WebSocket Client for Real-Time GPS Tracking
 * MESSOB Fleet Management System
 * 
 * Features:
 * - Real-time GPS position updates
 * - Automatic reconnection
 * - Event-based architecture
 * - React hooks for easy integration
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * GPS WebSocket Client
 * Manages WebSocket connection for real-time GPS updates
 */
export class GPSWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimer = null;
    this.isManualClose = false;
  }

  /**
   * Establish WebSocket connection
   */
  connect() {
    try {
      this.isManualClose = false;
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('[GPS WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[GPS WebSocket] Message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[GPS WebSocket] Error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = (event) => {
        console.log('[GPS WebSocket] Disconnected', event.code, event.reason);
        this.stopHeartbeat();
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        if (!this.isManualClose) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('[GPS WebSocket] Connection error:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    this.emit('message', data);
    
    // Handle different message types
    switch (data.type) {
      case 'gps_update':
        this.emit('gps_update', data.payload);
        break;
      case 'trip_update':
        this.emit('trip_update', data.payload);
        break;
      case 'alert':
        this.emit('alert', data.payload);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        console.warn('[GPS WebSocket] Unknown message type:', data.type);
    }
  }

  /**
   * Attempt to reconnect after disconnection
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      
      console.log(`[GPS WebSocket] Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(() => {
        if (!this.isManualClose) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('[GPS WebSocket] Max reconnection attempts reached');
      this.emit('max_reconnect_failed');
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat timer
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Subscribe to GPS updates for a specific vehicle
   */
  subscribe(vehicleId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        channel: `gps_position_${vehicleId}`
      });
      console.log(`[GPS WebSocket] Subscribed to vehicle ${vehicleId}`);
    } else {
      console.warn('[GPS WebSocket] Cannot subscribe - not connected');
    }
  }

  /**
   * Unsubscribe from GPS updates for a specific vehicle
   */
  unsubscribe(vehicleId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'unsubscribe',
        channel: `gps_position_${vehicleId}`
      });
      console.log(`[GPS WebSocket] Unsubscribed from vehicle ${vehicleId}`);
    }
  }

  /**
   * Send message through WebSocket
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[GPS WebSocket] Cannot send - not connected');
    }
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Unregister event listener
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all registered listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[GPS WebSocket] Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect() {
    this.isManualClose = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    console.log('[GPS WebSocket] Manually disconnected');
  }

  /**
   * Get connection state
   */
  getState() {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * React Hook for GPS Tracking
 * Provides real-time GPS position updates for a vehicle
 * 
 * @param {number} vehicleId - Vehicle ID to track
 * @param {object} options - Configuration options
 * @returns {object} - { position, isConnected, error, reconnect }
 */
export function useGPSTracking(vehicleId, options = {}) {
  const [position, setPosition] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  // Determine WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = options.wsHost || window.location.hostname;
    const port = options.wsPort || '8072';
    return `${protocol}//${host}:${port}/websocket`;
  }, [options.wsHost, options.wsPort]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!vehicleId) return;

    const wsUrl = getWebSocketUrl();
    wsRef.current = new GPSWebSocket(wsUrl, {
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 3000,
      heartbeatInterval: options.heartbeatInterval || 30000,
    });

    // Set up event listeners
    wsRef.current.on('connected', () => {
      console.log(`[useGPSTracking] Connected for vehicle ${vehicleId}`);
      setIsConnected(true);
      setError(null);
      wsRef.current.subscribe(vehicleId);
    });

    wsRef.current.on('disconnected', () => {
      console.log(`[useGPSTracking] Disconnected for vehicle ${vehicleId}`);
      setIsConnected(false);
    });

    wsRef.current.on('error', (err) => {
      console.error(`[useGPSTracking] Error for vehicle ${vehicleId}:`, err);
      setError(err);
    });

    wsRef.current.on('gps_update', (data) => {
      if (data.vehicle_id === vehicleId) {
        setPosition({
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed || 0,
          heading: data.heading || 0,
          altitude: data.altitude || 0,
          accuracy: data.accuracy || 0,
          timestamp: data.timestamp,
        });
      }
    });

    wsRef.current.on('max_reconnect_failed', () => {
      setError(new Error('Failed to reconnect after maximum attempts'));
    });

    // Connect
    wsRef.current.connect();

    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.unsubscribe(vehicleId);
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [vehicleId, getWebSocketUrl, options.maxReconnectAttempts, options.reconnectDelay, options.heartbeatInterval]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      setTimeout(() => {
        wsRef.current.connect();
      }, 1000);
    }
  }, []);

  return { position, isConnected, error, reconnect };
}

/**
 * React Hook for Multiple Vehicle Tracking
 * Tracks multiple vehicles simultaneously
 * 
 * @param {array} vehicleIds - Array of vehicle IDs to track
 * @param {object} options - Configuration options
 * @returns {object} - { positions, isConnected, error, reconnect }
 */
export function useMultiVehicleTracking(vehicleIds = [], options = {}) {
  const [positions, setPositions] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = options.wsHost || window.location.hostname;
    const port = options.wsPort || '8072';
    return `${protocol}//${host}:${port}/websocket`;
  }, [options.wsHost, options.wsPort]);

  useEffect(() => {
    if (!vehicleIds || vehicleIds.length === 0) return;

    const wsUrl = getWebSocketUrl();
    wsRef.current = new GPSWebSocket(wsUrl, options);

    wsRef.current.on('connected', () => {
      setIsConnected(true);
      setError(null);
      vehicleIds.forEach(id => wsRef.current.subscribe(id));
    });

    wsRef.current.on('disconnected', () => {
      setIsConnected(false);
    });

    wsRef.current.on('error', (err) => {
      setError(err);
    });

    wsRef.current.on('gps_update', (data) => {
      if (vehicleIds.includes(data.vehicle_id)) {
        setPositions(prev => ({
          ...prev,
          [data.vehicle_id]: {
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed || 0,
            heading: data.heading || 0,
            altitude: data.altitude || 0,
            accuracy: data.accuracy || 0,
            timestamp: data.timestamp,
          }
        }));
      }
    });

    wsRef.current.connect();

    return () => {
      if (wsRef.current) {
        vehicleIds.forEach(id => wsRef.current.unsubscribe(id));
        wsRef.current.disconnect();
      }
    };
  }, [vehicleIds, getWebSocketUrl, options]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      setTimeout(() => wsRef.current.connect(), 1000);
    }
  }, []);

  return { positions, isConnected, error, reconnect };
}

export default GPSWebSocket;
