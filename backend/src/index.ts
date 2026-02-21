/**
 * Factory Monitoring Backend
 * ==========================
 * Main entry point for the Node.js/TypeScript API server.
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import sensorRoutes from './routes/sensors';
import aggregateRoutes from './routes/aggregates';

// Import services
import { MqttService } from './services/mqtt.service';
import { InfluxService } from './services/influx.service';
import { VideoRelayService } from './services/video-relay.service';
import { AggregationJob } from './jobs/aggregation.job';
import { prisma } from './lib/prisma';

// Configuration
const PORT = process.env.PORT || 3000;
const VIDEO_PORT = parseInt(process.env.VIDEO_PORT || '3001', 10);
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim());

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO (perMessageDeflate: false avoids "Invalid frame header" in some browsers/proxies)
const io = new SocketIOServer(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  perMessageDeflate: false,
});

// Middleware
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/aggregates', aggregateRoutes);

// Initialize services
async function initializeServices() {
  console.log('🚀 Initializing Factory Monitoring Backend...');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');

    // Initialize InfluxDB service
    const influxService = InfluxService.getInstance();
    await influxService.initialize();
    console.log('✅ InfluxDB connected');

    // Initialize MQTT service
    const mqttService = MqttService.getInstance();
    await mqttService.connect();
    
    // Setup MQTT -> InfluxDB pipeline
    mqttService.onSensorData(async (data) => {
      try {
        await influxService.writeSensorData(data);
        // Broadcast to connected frontend clients
        io.emit('sensor-data', data);
      } catch (err) {
        console.error('Error processing sensor data:', err);
      }
    });
    console.log('✅ MQTT service initialized');

    // Initialize video relay on separate server (avoids Socket.IO "Invalid frame header")
    const videoRelay = VideoRelayService.getInstance(io);
    videoRelay.initialize(VIDEO_PORT);
    console.log('✅ Video relay service initialized');

    // Initialize aggregation cron job
    const aggregationJob = new AggregationJob(influxService);
    aggregationJob.start();
    console.log('✅ Aggregation job started (runs every minute)');

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });

      // Subscribe to specific data channels
      socket.on('subscribe', (channel: string) => {
        socket.join(channel);
        console.log(`📺 Client ${socket.id} subscribed to ${channel}`);
      });

      socket.on('unsubscribe', (channel: string) => {
        socket.leave(channel);
        console.log(`📺 Client ${socket.id} unsubscribed from ${channel}`);
      });
    });

    // Start server
    server.listen(PORT, () => {
      console.log(`\n🏭 Factory Monitoring Backend running on port ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Socket.IO (live data): ws://localhost:${PORT}`);
      console.log(`   Video ingest: ws://localhost:${VIDEO_PORT}/video`);
      console.log(`   Health: http://localhost:${PORT}/health\n`);
    });

  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  MqttService.getInstance().disconnect();
  VideoRelayService.getInstance().close();
  await prisma.$disconnect();
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  shutdown();
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  shutdown();
});

// Start the application
initializeServices();

export { io };

