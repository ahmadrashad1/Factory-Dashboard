/**
 * Sensors Store
 * =============
 * Manages sensor data and real-time updates
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { io } from 'socket.io-client';
import api from '../services/api';

export const useSensorsStore = defineStore('sensors', () => {
  // State
  const socket = ref(null);
  const connected = ref(false);
  const sensorData = ref({});
  const historicalData = ref({});
  const aggregates = ref([]);
  const videoFrame = ref(null);
  const machines = ref(['MACHINE-001', 'MACHINE-002', 'MACHINE-003']);

  // Data buffers for charts (last 100 points per machine)
  const MAX_DATA_POINTS = 100;

  // Getters
  const latestByMachine = computed(() => {
    const result = {};
    machines.value.forEach((machineId) => {
      const data = sensorData.value[machineId];
      if (data && data.length > 0) {
        result[machineId] = data[data.length - 1];
      }
    });
    return result;
  });

  const allMachineData = computed(() => {
    return machines.value.map((machineId) => ({
      machineId,
      data: sensorData.value[machineId] || [],
      latest: latestByMachine.value[machineId] || null,
    }));
  });

  // Actions
  function connectSocket() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    
    socket.value = io(wsUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.value.on('connect', () => {
      console.log('🔌 Socket connected');
      connected.value = true;
    });

    socket.value.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      connected.value = false;
    });

    socket.value.on('sensor-data', (data) => {
      handleSensorData(data);
    });

    socket.value.on('video-frame', (frame) => {
      videoFrame.value = frame;
    });
  }

  function handleSensorData(data) {
    const { machineId } = data;
    
    if (!sensorData.value[machineId]) {
      sensorData.value[machineId] = [];
    }

    // Add new data point
    sensorData.value[machineId].push({
      temperature: data.temperature,
      pressure: data.pressure,
      timestamp: data.timestamp,
    });

    // Keep only last MAX_DATA_POINTS
    if (sensorData.value[machineId].length > MAX_DATA_POINTS) {
      sensorData.value[machineId].shift();
    }
  }

  function disconnectSocket() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
    connected.value = false;
  }

  async function fetchAggregates(limit = 60) {
    try {
      const response = await api.get('/api/aggregates', {
        params: { limit },
      });
      aggregates.value = response.data.aggregates;
      return response.data.aggregates;
    } catch (err) {
      console.error('Failed to fetch aggregates:', err);
      return [];
    }
  }

  async function fetchHistoricalData(machineId, startTime = '-1h') {
    try {
      const response = await api.get(`/api/sensors/history/${machineId}`, {
        params: { startTime },
      });
      historicalData.value[machineId] = response.data.data;
      return response.data.data;
    } catch (err) {
      console.error('Failed to fetch historical data:', err);
      return [];
    }
  }

  async function fetchLatestData(limit = 50) {
    try {
      const response = await api.get('/api/sensors/latest', {
        params: { limit },
      });
      
      // Group by machine
      response.data.data.forEach((item) => {
        if (!sensorData.value[item.machineId]) {
          sensorData.value[item.machineId] = [];
        }
        sensorData.value[item.machineId].push({
          temperature: item.temperature,
          pressure: item.pressure,
          timestamp: item.time,
        });
      });

      return response.data.data;
    } catch (err) {
      console.error('Failed to fetch latest data:', err);
      return [];
    }
  }

  return {
    // State
    socket,
    connected,
    sensorData,
    historicalData,
    aggregates,
    videoFrame,
    machines,
    // Getters
    latestByMachine,
    allMachineData,
    // Actions
    connectSocket,
    disconnectSocket,
    handleSensorData,
    fetchAggregates,
    fetchHistoricalData,
    fetchLatestData,
  };
});

