#!/usr/bin/env python3
"""
Factory Machinery Simulator
===========================
Multi-threaded simulator that generates:
1. Sensor data (temperature, pressure) for 3 machines via MQTT
2. Video frames from a local file or generated pattern via WebSocket
"""

import os
import sys
import json
import time
import random
import base64
import logging
import threading
from datetime import datetime
from typing import Optional

import cv2
import numpy as np
import paho.mqtt.client as mqtt
from websocket import WebSocketApp, WebSocketException

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('FactorySimulator')

# Configuration from environment
MQTT_BROKER_HOST = os.getenv('MQTT_BROKER_HOST', 'localhost')
MQTT_BROKER_PORT = int(os.getenv('MQTT_BROKER_PORT', 1883))
BACKEND_WS_URL = os.getenv('BACKEND_WS_URL', 'ws://localhost:3000')
SENSOR_INTERVAL_MS = int(os.getenv('SENSOR_INTERVAL_MS', 500))
VIDEO_FPS = int(os.getenv('VIDEO_FPS', 15))

# MQTT Topics
MQTT_TOPIC_SENSORS = 'factory/sensors'

# Machine IDs
MACHINE_IDS = ['MACHINE-001', 'MACHINE-002', 'MACHINE-003']

# Simulation parameters for each machine
MACHINE_PARAMS = {
    'MACHINE-001': {
        'temp_base': 75.0,
        'temp_variance': 5.0,
        'pressure_base': 100.0,
        'pressure_variance': 10.0,
    },
    'MACHINE-002': {
        'temp_base': 85.0,
        'temp_variance': 8.0,
        'pressure_base': 120.0,
        'pressure_variance': 15.0,
    },
    'MACHINE-003': {
        'temp_base': 65.0,
        'temp_variance': 3.0,
        'pressure_base': 90.0,
        'pressure_variance': 8.0,
    },
}


class SensorSimulator(threading.Thread):
    """
    Thread 1: Generates random temperature and pressure data for 3 machines.
    Publishes to MQTT Broker every 500ms.
    """
    
    def __init__(self, mqtt_client: mqtt.Client):
        super().__init__(daemon=True)
        self.mqtt_client = mqtt_client
        self.running = True
        self._lock = threading.Lock()
        
        # State for smooth value transitions
        self.current_values = {
            machine_id: {
                'temperature': params['temp_base'],
                'pressure': params['pressure_base'],
            }
            for machine_id, params in MACHINE_PARAMS.items()
        }
    
    def _generate_sensor_data(self, machine_id: str) -> dict:
        """Generate realistic sensor data with smooth transitions."""
        params = MACHINE_PARAMS[machine_id]
        current = self.current_values[machine_id]
        
        # Smooth random walk for temperature
        temp_delta = random.gauss(0, params['temp_variance'] * 0.1)
        new_temp = current['temperature'] + temp_delta
        # Keep within bounds
        new_temp = max(params['temp_base'] - params['temp_variance'],
                      min(params['temp_base'] + params['temp_variance'], new_temp))
        
        # Smooth random walk for pressure
        pressure_delta = random.gauss(0, params['pressure_variance'] * 0.1)
        new_pressure = current['pressure'] + pressure_delta
        # Keep within bounds
        new_pressure = max(params['pressure_base'] - params['pressure_variance'],
                          min(params['pressure_base'] + params['pressure_variance'], new_pressure))
        
        # Update state
        self.current_values[machine_id]['temperature'] = new_temp
        self.current_values[machine_id]['pressure'] = new_pressure
        
        # Occasionally add anomalies (5% chance)
        if random.random() < 0.05:
            new_temp += random.choice([-1, 1]) * params['temp_variance'] * 0.5
            new_pressure += random.choice([-1, 1]) * params['pressure_variance'] * 0.5
        
        return {
            'machineId': machine_id,
            'temperature': round(new_temp, 2),
            'pressure': round(new_pressure, 2),
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'unit_temp': 'celsius',
            'unit_pressure': 'psi',
        }
    
    def run(self):
        """Main loop: publish sensor data every SENSOR_INTERVAL_MS."""
        logger.info(f"🌡️ Sensor Simulator started - Publishing every {SENSOR_INTERVAL_MS}ms")
        
        while self.running:
            try:
                for machine_id in MACHINE_IDS:
                    data = self._generate_sensor_data(machine_id)
                    payload = json.dumps(data)
                    
                    result = self.mqtt_client.publish(
                        MQTT_TOPIC_SENSORS,
                        payload,
                        qos=1
                    )
                    
                    if result.rc == mqtt.MQTT_ERR_SUCCESS:
                        logger.debug(f"📤 Published: {machine_id} - T:{data['temperature']}°C P:{data['pressure']}psi")
                    else:
                        logger.warning(f"⚠️ Failed to publish for {machine_id}")
                
                time.sleep(SENSOR_INTERVAL_MS / 1000.0)
                
            except Exception as e:
                logger.error(f"❌ Sensor simulation error: {e}")
                time.sleep(1)
    
    def stop(self):
        """Stop the sensor simulator."""
        self.running = False


class VideoSimulator(threading.Thread):
    """
    Thread 2: Simulates a live camera feed.
    Reads from a local video file (looping) or generates synthetic frames.
    Emits frames via WebSocket to the backend.
    """
    
    def __init__(self, video_source: Optional[str] = None):
        super().__init__(daemon=True)
        self.video_source = video_source
        self.running = True
        self.ws: Optional[WebSocketApp] = None
        self.ws_connected = False
        self.frame_queue = []
        self._lock = threading.Lock()
        
        # Frame dimensions
        self.frame_width = 640
        self.frame_height = 480
        
        # For synthetic frame generation
        self.frame_counter = 0
    
    def _generate_synthetic_frame(self) -> np.ndarray:
        """Generate a synthetic factory monitoring frame."""
        # Create base frame with dark gray background
        frame = np.zeros((self.frame_height, self.frame_width, 3), dtype=np.uint8)
        frame[:] = (30, 30, 35)  # Dark gray background
        
        # Add grid pattern
        for i in range(0, self.frame_width, 40):
            cv2.line(frame, (i, 0), (i, self.frame_height), (50, 50, 55), 1)
        for i in range(0, self.frame_height, 40):
            cv2.line(frame, (0, i), (self.frame_width, i), (50, 50, 55), 1)
        
        # Add timestamp
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cv2.putText(frame, timestamp, (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Add "FACTORY CAM" label
        cv2.putText(frame, "FACTORY CAM 01", (10, 60),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        # Simulate machine indicators with pulsing effect
        pulse = abs(np.sin(self.frame_counter * 0.1)) * 0.5 + 0.5
        
        for i, machine_id in enumerate(MACHINE_IDS):
            x = 50 + i * 200
            y = 150
            
            # Machine box
            color = (0, int(200 * pulse), 0) if random.random() > 0.05 else (0, 0, 255)
            cv2.rectangle(frame, (x, y), (x + 150, y + 200), color, 2)
            cv2.putText(frame, machine_id.split('-')[1], (x + 30, y + 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Simulated activity bars
            activity = random.randint(20, 100)
            bar_height = int(activity * 1.5)
            cv2.rectangle(frame, (x + 20, y + 180 - bar_height), 
                         (x + 60, y + 180), (0, 255, 100), -1)
            
            # Status indicator
            status_color = (0, 255, 0) if random.random() > 0.1 else (0, 165, 255)
            cv2.circle(frame, (x + 130, y + 20), 8, status_color, -1)
        
        # Add moving scan line effect
        scan_y = (self.frame_counter * 3) % self.frame_height
        cv2.line(frame, (0, scan_y), (self.frame_width, scan_y), (0, 100, 0), 1)
        
        # Add frame counter
        cv2.putText(frame, f"Frame: {self.frame_counter}", (self.frame_width - 150, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)
        
        self.frame_counter += 1
        return frame
    
    def _frame_to_base64(self, frame: np.ndarray) -> str:
        """Convert frame to base64 JPEG string."""
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        return base64.b64encode(buffer).decode('utf-8')
    
    def _on_ws_open(self, ws):
        """WebSocket connection opened."""
        logger.info("🎥 Video WebSocket connected to backend")
        self.ws_connected = True
        
        # Send identification message
        ws.send(json.dumps({
            'type': 'simulator-connect',
            'source': 'video-simulator'
        }))
    
    def _on_ws_close(self, ws, close_status_code, close_msg):
        """WebSocket connection closed."""
        logger.warning(f"🔌 Video WebSocket disconnected: {close_msg}")
        self.ws_connected = False
    
    def _on_ws_error(self, ws, error):
        """WebSocket error occurred."""
        logger.error(f"❌ Video WebSocket error: {error}")
        self.ws_connected = False
    
    def _connect_websocket(self):
        """Establish WebSocket connection to backend."""
        ws_url = f"{BACKEND_WS_URL}/video"
        logger.info(f"🔗 Connecting video stream to {ws_url}")
        
        self.ws = WebSocketApp(
            ws_url,
            on_open=self._on_ws_open,
            on_close=self._on_ws_close,
            on_error=self._on_ws_error
        )
        
        # Run WebSocket in background
        ws_thread = threading.Thread(target=self.ws.run_forever, daemon=True)
        ws_thread.start()
    
    def run(self):
        """Main loop: capture and send video frames."""
        logger.info(f"🎬 Video Simulator started - Target FPS: {VIDEO_FPS}")
        
        # Try to open video source
        cap = None
        if self.video_source and os.path.exists(self.video_source):
            cap = cv2.VideoCapture(self.video_source)
            if not cap.isOpened():
                logger.warning(f"⚠️ Could not open video file: {self.video_source}")
                cap = None
        
        # Connect to WebSocket
        self._connect_websocket()
        
        # Wait for connection
        retry_count = 0
        while not self.ws_connected and retry_count < 30:
            time.sleep(1)
            retry_count += 1
            if retry_count % 5 == 0:
                logger.info("⏳ Waiting for WebSocket connection...")
                self._connect_websocket()
        
        if not self.ws_connected:
            logger.error("❌ Could not establish WebSocket connection")
        
        frame_interval = 1.0 / VIDEO_FPS
        
        while self.running:
            try:
                start_time = time.time()
                
                # Get frame
                if cap is not None:
                    ret, frame = cap.read()
                    if not ret:
                        # Loop video
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = cap.read()
                    if ret:
                        frame = cv2.resize(frame, (self.frame_width, self.frame_height))
                else:
                    frame = self._generate_synthetic_frame()
                
                # Send frame if connected
                if self.ws_connected and self.ws:
                    try:
                        frame_b64 = self._frame_to_base64(frame)
                        message = json.dumps({
                            'type': 'video-frame',
                            'data': frame_b64,
                            'timestamp': datetime.utcnow().isoformat() + 'Z',
                            'width': self.frame_width,
                            'height': self.frame_height
                        })
                        self.ws.send(message)
                    except Exception as e:
                        logger.debug(f"Frame send error: {e}")
                
                # Maintain frame rate
                elapsed = time.time() - start_time
                if elapsed < frame_interval:
                    time.sleep(frame_interval - elapsed)
                    
            except Exception as e:
                logger.error(f"❌ Video simulation error: {e}")
                time.sleep(1)
        
        # Cleanup
        if cap is not None:
            cap.release()
        if self.ws:
            self.ws.close()
    
    def stop(self):
        """Stop the video simulator."""
        self.running = False


class FactorySimulator:
    """
    Main factory simulator that coordinates sensor and video threads.
    """
    
    def __init__(self):
        self.mqtt_client: Optional[mqtt.Client] = None
        self.sensor_thread: Optional[SensorSimulator] = None
        self.video_thread: Optional[VideoSimulator] = None
        self.running = False
    
    def _setup_mqtt(self) -> bool:
        """Setup MQTT client connection."""
        try:
            self.mqtt_client = mqtt.Client(
                client_id=f"factory-simulator-{random.randint(1000, 9999)}",
                protocol=mqtt.MQTTv311
            )
            
            def on_connect(client, userdata, flags, rc):
                if rc == 0:
                    logger.info(f"✅ MQTT Connected to {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}")
                else:
                    logger.error(f"❌ MQTT Connection failed with code: {rc}")
            
            def on_disconnect(client, userdata, rc):
                logger.warning(f"🔌 MQTT Disconnected with code: {rc}")
            
            self.mqtt_client.on_connect = on_connect
            self.mqtt_client.on_disconnect = on_disconnect
            
            # Connect with retry
            for attempt in range(10):
                try:
                    self.mqtt_client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=60)
                    self.mqtt_client.loop_start()
                    return True
                except Exception as e:
                    logger.warning(f"MQTT connection attempt {attempt + 1} failed: {e}")
                    time.sleep(2)
            
            return False
            
        except Exception as e:
            logger.error(f"❌ MQTT setup failed: {e}")
            return False
    
    def start(self, video_source: Optional[str] = None):
        """Start all simulator threads."""
        logger.info("🏭 Factory Simulator Starting...")
        
        # Setup MQTT
        if not self._setup_mqtt():
            logger.error("Failed to setup MQTT. Exiting.")
            return
        
        # Start sensor thread
        self.sensor_thread = SensorSimulator(self.mqtt_client)
        self.sensor_thread.start()
        
        # Start video thread
        self.video_thread = VideoSimulator(video_source)
        self.video_thread.start()
        
        self.running = True
        logger.info("✅ Factory Simulator is running!")
        
        # Keep main thread alive
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("\n🛑 Shutdown requested...")
            self.stop()
    
    def stop(self):
        """Stop all simulator threads."""
        logger.info("🛑 Stopping Factory Simulator...")
        self.running = False
        
        if self.sensor_thread:
            self.sensor_thread.stop()
        
        if self.video_thread:
            self.video_thread.stop()
        
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
        
        logger.info("👋 Factory Simulator stopped.")


def main():
    """Entry point for the factory simulator."""
    # Check for video file argument
    video_source = None
    if len(sys.argv) > 1:
        video_source = sys.argv[1]
        if not os.path.exists(video_source):
            logger.warning(f"Video file not found: {video_source}")
            video_source = None
    
    # Check for sample video in current directory
    if video_source is None and os.path.exists('sample_video.mp4'):
        video_source = 'sample_video.mp4'
    
    simulator = FactorySimulator()
    simulator.start(video_source)


if __name__ == '__main__':
    main()

