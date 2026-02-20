/**
 * InfluxDB Service
 * ================
 * Handles time series data storage and retrieval.
 */

import { InfluxDB, Point, QueryApi, WriteApi } from '@influxdata/influxdb-client';
import { SensorData } from './mqtt.service';

export interface SensorQueryResult {
  time: string;
  machineId: string;
  temperature: number;
  pressure: number;
}

export interface AggregatedData {
  machineId: string;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  avgPressure: number;
  minPressure: number;
  maxPressure: number;
  count: number;
}

export class InfluxService {
  private static instance: InfluxService;
  private client: InfluxDB | null = null;
  private writeApi: WriteApi | null = null;
  private queryApi: QueryApi | null = null;

  private readonly url: string;
  private readonly token: string;
  private readonly org: string;
  private readonly bucket: string;

  private constructor() {
    this.url = process.env.INFLUXDB_URL || 'http://localhost:8086';
    this.token = process.env.INFLUXDB_TOKEN || 'factory-super-secret-token';
    this.org = process.env.INFLUXDB_ORG || 'factory-org';
    this.bucket = process.env.INFLUXDB_BUCKET || 'sensor-data';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): InfluxService {
    if (!InfluxService.instance) {
      InfluxService.instance = new InfluxService();
    }
    return InfluxService.instance;
  }

  /**
   * Initialize InfluxDB connection
   */
  async initialize(): Promise<void> {
    console.log(`📊 Connecting to InfluxDB: ${this.url}`);

    this.client = new InfluxDB({
      url: this.url,
      token: this.token,
    });

    this.writeApi = this.client.getWriteApi(this.org, this.bucket, 'ms');
    this.writeApi.useDefaultTags({ source: 'factory-simulator' });

    this.queryApi = this.client.getQueryApi(this.org);

    // Test connection
    try {
      const healthApi = this.client.getHealthApi();
      const health = await healthApi.getHealth();
      console.log(`✅ InfluxDB health: ${health.status}`);
    } catch (err) {
      console.warn('⚠️ Could not check InfluxDB health, continuing anyway');
    }
  }

  /**
   * Write sensor data point to InfluxDB
   */
  async writeSensorData(data: SensorData): Promise<void> {
    if (!this.writeApi) {
      throw new Error('InfluxDB not initialized');
    }

    const point = new Point('sensor_reading')
      .tag('machineId', data.machineId)
      .floatField('temperature', data.temperature)
      .floatField('pressure', data.pressure)
      .timestamp(new Date(data.timestamp));

    this.writeApi.writePoint(point);
    
    // Flush periodically (every point for real-time)
    try {
      await this.writeApi.flush();
    } catch (err) {
      console.error('InfluxDB write error:', err);
    }
  }

  /**
   * Query latest sensor data
   */
  async getLatestData(machineId?: string, limit = 100): Promise<SensorQueryResult[]> {
    if (!this.queryApi) {
      throw new Error('InfluxDB not initialized');
    }

    const machineFilter = machineId 
      ? `|> filter(fn: (r) => r.machineId == "${machineId}")`
      : '';

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        ${machineFilter}
        |> pivot(rowKey: ["_time", "machineId"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: ${limit})
    `;

    const results: SensorQueryResult[] = [];

    return new Promise((resolve, reject) => {
      this.queryApi!.queryRows(query, {
        next: (row, tableMeta) => {
          const data = tableMeta.toObject(row);
          results.push({
            time: data._time,
            machineId: data.machineId,
            temperature: data.temperature,
            pressure: data.pressure,
          });
        },
        error: (err) => {
          console.error('InfluxDB query error:', err);
          reject(err);
        },
        complete: () => {
          resolve(results);
        },
      });
    });
  }

  /**
   * Query historical data for charts
   */
  async getHistoricalData(
    machineId: string,
    startTime: string = '-1h',
    endTime: string = 'now()'
  ): Promise<SensorQueryResult[]> {
    if (!this.queryApi) {
      throw new Error('InfluxDB not initialized');
    }

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime}, stop: ${endTime})
        |> filter(fn: (r) => r._measurement == "sensor_reading")
        |> filter(fn: (r) => r.machineId == "${machineId}")
        |> pivot(rowKey: ["_time", "machineId"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: false)
    `;

    const results: SensorQueryResult[] = [];

    return new Promise((resolve, reject) => {
      this.queryApi!.queryRows(query, {
        next: (row, tableMeta) => {
          const data = tableMeta.toObject(row);
          results.push({
            time: data._time,
            machineId: data.machineId,
            temperature: data.temperature,
            pressure: data.pressure,
          });
        },
        error: (err) => {
          console.error('InfluxDB query error:', err);
          reject(err);
        },
        complete: () => {
          resolve(results);
        },
      });
    });
  }

  /**
   * Get aggregated data for the last N minutes
   */
  async getAggregatedData(minutes: number = 1): Promise<AggregatedData[]> {
    if (!this.queryApi) {
      throw new Error('InfluxDB not initialized');
    }

    const machineIds = ['MACHINE-001', 'MACHINE-002', 'MACHINE-003'];
    const results: AggregatedData[] = [];

    for (const machineId of machineIds) {
      const query = `
        from(bucket: "${this.bucket}")
          |> range(start: -${minutes}m)
          |> filter(fn: (r) => r._measurement == "sensor_reading")
          |> filter(fn: (r) => r.machineId == "${machineId}")
          |> pivot(rowKey: ["_time", "machineId"], columnKey: ["_field"], valueColumn: "_value")
      `;

      const data: { temperature: number; pressure: number }[] = [];

      await new Promise<void>((resolve, reject) => {
        this.queryApi!.queryRows(query, {
          next: (row, tableMeta) => {
            const obj = tableMeta.toObject(row);
            data.push({
              temperature: obj.temperature,
              pressure: obj.pressure,
            });
          },
          error: (err) => {
            console.error('InfluxDB aggregation query error:', err);
            reject(err);
          },
          complete: () => {
            resolve();
          },
        });
      });

      if (data.length > 0) {
        const temps = data.map((d) => d.temperature);
        const pressures = data.map((d) => d.pressure);

        results.push({
          machineId,
          avgTemperature: temps.reduce((a, b) => a + b, 0) / temps.length,
          minTemperature: Math.min(...temps),
          maxTemperature: Math.max(...temps),
          avgPressure: pressures.reduce((a, b) => a + b, 0) / pressures.length,
          minPressure: Math.min(...pressures),
          maxPressure: Math.max(...pressures),
          count: data.length,
        });
      }
    }

    return results;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.writeApi) {
      await this.writeApi.close();
    }
  }
}

