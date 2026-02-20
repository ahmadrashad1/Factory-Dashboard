/**
 * Sensor Routes
 * =============
 * API endpoints for sensor data access.
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { InfluxService } from '../services/influx.service';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/sensors/latest
 * Get latest sensor readings for all or specific machine
 */
router.get('/latest', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const machineId = req.query.machineId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const influxService = InfluxService.getInstance();
    const data = await influxService.getLatestData(machineId, limit);

    res.json({
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sensor data',
    });
  }
});

/**
 * GET /api/sensors/history/:machineId
 * Get historical sensor data for a specific machine
 */
router.get('/history/:machineId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { machineId } = req.params;
    const startTime = (req.query.startTime as string) || '-1h';
    const endTime = (req.query.endTime as string) || 'now()';

    const influxService = InfluxService.getInstance();
    const data = await influxService.getHistoricalData(machineId, startTime, endTime);

    res.json({
      machineId,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch historical data',
    });
  }
});

/**
 * GET /api/sensors/machines
 * Get list of all known machines
 */
router.get('/machines', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { prisma } = await import('../lib/prisma');
    
    const machines = await prisma.machine.findMany({
      orderBy: { machineId: 'asc' },
    });

    res.json({
      count: machines.length,
      machines,
    });
  } catch (error) {
    console.error('Error fetching machines:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch machines',
    });
  }
});

export default router;

