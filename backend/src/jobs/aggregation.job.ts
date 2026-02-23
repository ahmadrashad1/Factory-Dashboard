/**
 * Aggregation Job
 * ===============
 * Cron job that runs every minute to calculate aggregated statistics
 * and store them in PostgreSQL.
 */

import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { InfluxService } from '../services/influx.service';

export class AggregationJob {
  private influxService: InfluxService;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(influxService: InfluxService) {
    this.influxService = influxService;
  }

  /**
   * Start the aggregation cron job
   * Runs every minute
   */
  start(): void {
    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.runAggregation();
    });

    console.log('⏰ Aggregation job scheduled (runs every minute)');
  }

  /**
   * Run the aggregation process
   */
  async runAggregation(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ Aggregation already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('📊 Running 1-minute aggregation...');

      // Get aggregated data from InfluxDB
      const aggregatedData = await this.influxService.getAggregatedData(1);

      if (aggregatedData.length === 0) {
        console.log('📊 No data to aggregate');
        this.isRunning = false;
        return;
      }

      const now = new Date();
      const periodEnd = now;
      const periodStart = new Date(now.getTime() - 60000); // 1 minute ago

      // Store aggregated data in PostgreSQL
      for (const data of aggregatedData) {
        await prisma.sensorAggregate.create({
          data: {
            machineId: data.machineId,
            avgTemperature: Number(data.avgTemperature.toFixed(2)),
            minTemperature: Number(data.minTemperature.toFixed(2)),
            maxTemperature: Number(data.maxTemperature.toFixed(2)),
            avgPressure: Number(data.avgPressure.toFixed(2)),
            minPressure: Number(data.minPressure.toFixed(2)),
            maxPressure: Number(data.maxPressure.toFixed(2)),
            dataPoints: data.count,
            periodStart,
            periodEnd,
          },
        });

        // Update machine last seen timestamp
        await prisma.machine.upsert({
          where: { machineId: data.machineId },
          update: { 
            lastSeen: now,
            status: 'ONLINE'
          },
          create: {
            machineId: data.machineId,
            name: `Machine ${data.machineId.split('-')[1]}`,
            status: 'ONLINE',
            lastSeen: now,
          },
        });
      }

      const elapsed = Date.now() - startTime;
      console.log(
        `✅ Aggregation complete: ${aggregatedData.length} machines processed in ${elapsed}ms`
      );

      // Log summary
      for (const data of aggregatedData) {
        console.log(
          `   ${data.machineId}: Avg Temp: ${data.avgTemperature.toFixed(1)}°C, ` +
          `Avg Pressure: ${data.avgPressure.toFixed(1)} psi (${data.count} points)`
        );
      }

    } catch (error) {
      console.error('❌ Aggregation error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 Aggregation job stopped');
    }
  }

  /**
   * Manually trigger aggregation (for testing)
   */
  async triggerManual(): Promise<void> {
    await this.runAggregation();
  }
}

