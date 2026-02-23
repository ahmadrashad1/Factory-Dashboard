/**
 * MQTT Service
 * ============
 * Handles MQTT broker connection and sensor data subscription.
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';

export interface SensorData {
  machineId: string;
  temperature: number;
  pressure: number;
  timestamp: string;
  unit_temp: string;
  unit_pressure: string;
}

type SensorDataCallback = (data: SensorData) => void;

export class MqttService {
  private static instance: MqttService;
  private client: MqttClient | null = null;
  private callbacks: SensorDataCallback[] = [];
  private isConnected = false;

  private readonly brokerUrl: string;
  private readonly topic = 'factory/sensors';

  private constructor() {
    this.brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MqttService {
    if (!MqttService.instance) {
      MqttService.instance = new MqttService();
    }
    return MqttService.instance;
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: IClientOptions = {
        clientId: `factory-backend-${Date.now()}`,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 5000,
      };

      console.log(`📡 Connecting to MQTT broker: ${this.brokerUrl}`);

      this.client = mqtt.connect(this.brokerUrl, options);

      this.client.on('connect', () => {
        console.log('✅ MQTT connected successfully');
        this.isConnected = true;

        // Subscribe to sensor topic
        this.client!.subscribe(this.topic, { qos: 1 }, (err) => {
          if (err) {
            console.error('❌ Failed to subscribe to topic:', err);
            reject(err);
          } else {
            console.log(`📥 Subscribed to topic: ${this.topic}`);
            resolve();
          }
        });
      });

      this.client.on('message', (topic, message) => {
        if (topic === this.topic) {
          try {
            const data: SensorData = JSON.parse(message.toString());
            this.notifyCallbacks(data);
          } catch (err) {
            console.error('Failed to parse MQTT message:', err);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('❌ MQTT error:', err);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('🔌 MQTT connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        console.log('🔄 MQTT reconnecting...');
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('⚠️ MQTT connection timeout, continuing without MQTT');
          resolve();
        }
      }, 10000);
    });
  }

  /**
   * Register callback for sensor data
   */
  onSensorData(callback: SensorDataCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(data: SensorData): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error('Callback error:', err);
      }
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect(): void {
    if (this.client) {
      this.client.end(true);
      this.isConnected = false;
      console.log('👋 MQTT disconnected');
    }
  }

  /**
   * Check connection status
   */
  isConnectedToBroker(): boolean {
    return this.isConnected;
  }
}

