/**
 * Video Relay Service
 * ===================
 * Handles video frame relay from simulator to frontend clients.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

interface VideoFrame {
  type: string;
  data: string;
  timestamp: string;
  width: number;
  height: number;
}

export class VideoRelayService {
  private static instance: VideoRelayService;
  private io: SocketIOServer;
  private wss: WebSocketServer | null = null;
  private simulatorSocket: WebSocket | null = null;
  private frameCount = 0;
  private lastFrameTime = Date.now();

  private constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Get singleton instance
   */
  static getInstance(io?: SocketIOServer): VideoRelayService {
    if (!VideoRelayService.instance) {
      if (!io) {
        throw new Error('Socket.IO server required for first initialization');
      }
      VideoRelayService.instance = new VideoRelayService(io);
    }
    return VideoRelayService.instance;
  }

  /**
   * Initialize WebSocket server for simulator connection
   */
  initialize(): void {
    // Create WebSocket server on a different path for simulator
    const server = this.io.httpServer as http.Server;
    
    this.wss = new WebSocketServer({ 
      server,
      path: '/video'
    });

    console.log('🎥 Video relay WebSocket server initialized on /video');

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🎬 Video simulator connected');
      this.simulatorSocket = ws;

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'simulator-connect') {
            console.log(`📹 Simulator identified: ${data.source}`);
            return;
          }

          if (data.type === 'video-frame') {
            this.broadcastFrame(data);
          }
        } catch (err) {
          console.error('Video frame parse error:', err);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Video simulator disconnected');
        this.simulatorSocket = null;
      });

      ws.on('error', (err) => {
        console.error('Video WebSocket error:', err);
      });
    });

    // Log frame rate periodically
    setInterval(() => {
      const elapsed = (Date.now() - this.lastFrameTime) / 1000;
      if (elapsed > 0 && this.frameCount > 0) {
        const fps = this.frameCount / elapsed;
        console.log(`📊 Video relay: ${fps.toFixed(1)} FPS, ${this.io.engine.clientsCount} clients`);
        this.frameCount = 0;
        this.lastFrameTime = Date.now();
      }
    }, 10000);
  }

  /**
   * Broadcast video frame to all connected frontend clients
   */
  private broadcastFrame(frame: VideoFrame): void {
    this.frameCount++;
    
    // Emit to all clients subscribed to video channel
    this.io.emit('video-frame', {
      data: frame.data,
      timestamp: frame.timestamp,
      width: frame.width,
      height: frame.height,
    });
  }

  /**
   * Get current connection status
   */
  getStatus(): { simulatorConnected: boolean; clientCount: number } {
    return {
      simulatorConnected: this.simulatorSocket !== null,
      clientCount: this.io.engine.clientsCount,
    };
  }
}

