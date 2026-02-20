/**
 * Aggregates Routes
 * =================
 * API endpoints for aggregated sensor statistics from PostgreSQL.
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/aggregates
 * Get aggregated statistics (1-minute averages)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const machineId = req.query.machineId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 60;

    const where = machineId ? { machineId } : {};

    const aggregates = await prisma.sensorAggregate.findMany({
      where,
      orderBy: { periodEnd: 'desc' },
      take: limit,
    });

    res.json({
      count: aggregates.length,
      aggregates,
    });
  } catch (error) {
    console.error('Error fetching aggregates:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch aggregated data',
    });
  }
});

/**
 * GET /api/aggregates/latest
 * Get the most recent aggregate for each machine
 */
router.get('/latest', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get distinct machine IDs
    const machines = await prisma.machine.findMany({
      select: { machineId: true },
    });

    const latestAggregates = await Promise.all(
      machines.map(async (machine) => {
        const aggregate = await prisma.sensorAggregate.findFirst({
          where: { machineId: machine.machineId },
          orderBy: { periodEnd: 'desc' },
        });
        return aggregate;
      })
    );

    // Filter out null values
    const validAggregates = latestAggregates.filter((a) => a !== null);

    res.json({
      count: validAggregates.length,
      aggregates: validAggregates,
    });
  } catch (error) {
    console.error('Error fetching latest aggregates:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch latest aggregates',
    });
  }
});

/**
 * GET /api/aggregates/history/:machineId
 * Get aggregate history for a specific machine
 */
router.get('/history/:machineId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { machineId } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const aggregates = await prisma.sensorAggregate.findMany({
      where: {
        machineId,
        periodEnd: { gte: since },
      },
      orderBy: { periodEnd: 'asc' },
    });

    res.json({
      machineId,
      hours,
      count: aggregates.length,
      aggregates,
    });
  } catch (error) {
    console.error('Error fetching aggregate history:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch aggregate history',
    });
  }
});

/**
 * GET /api/aggregates/summary
 * Get summary statistics across all machines
 */
router.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const hours = parseInt(req.query.hours as string) || 1;
    
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const aggregates = await prisma.sensorAggregate.findMany({
      where: {
        periodEnd: { gte: since },
      },
    });

    if (aggregates.length === 0) {
      res.json({
        message: 'No data available for the specified period',
        summary: null,
      });
      return;
    }

    // Calculate overall summary
    const temps = aggregates.map((a) => a.avgTemperature);
    const pressures = aggregates.map((a) => a.avgPressure);

    const summary = {
      period: { hours, since: since.toISOString() },
      totalDataPoints: aggregates.reduce((sum, a) => sum + a.dataPoints, 0),
      aggregateCount: aggregates.length,
      temperature: {
        avg: temps.reduce((a, b) => a + b, 0) / temps.length,
        min: Math.min(...temps),
        max: Math.max(...temps),
      },
      pressure: {
        avg: pressures.reduce((a, b) => a + b, 0) / pressures.length,
        min: Math.min(...pressures),
        max: Math.max(...pressures),
      },
    };

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch summary',
    });
  }
});

export default router;

