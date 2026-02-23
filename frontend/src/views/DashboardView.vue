<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSensorsStore } from '../stores/sensors';

// Components
import SensorChart from '../components/SensorChart.vue';
import VideoFeed from '../components/VideoFeed.vue';
import StatsTable from '../components/StatsTable.vue';
import MachineCard from '../components/MachineCard.vue';

const router = useRouter();
const authStore = useAuthStore();
const sensorsStore = useSensorsStore();

const currentTime = ref(new Date().toLocaleTimeString());
const activeTab = ref('overview');

// Update clock
let clockInterval;

onMounted(() => {
  // Connect to WebSocket
  sensorsStore.connectSocket();
  
  // Fetch initial data
  sensorsStore.fetchAggregates();
  sensorsStore.fetchLatestData();
  
  // Start clock
  clockInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString();
  }, 1000);
  
  // Refresh aggregates periodically
  const aggregateInterval = setInterval(() => {
    sensorsStore.fetchAggregates();
  }, 60000);
  
  onUnmounted(() => {
    clearInterval(clockInterval);
    clearInterval(aggregateInterval);
    sensorsStore.disconnectSocket();
  });
});

function logout() {
  authStore.logout();
  router.push('/login');
}

const connectionStatus = computed(() => sensorsStore.connected ? 'ONLINE' : 'OFFLINE');
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header class="bg-industrial-900/80 backdrop-blur-md border-b border-industrial-700/50 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-factory-500 to-factory-700 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 class="text-lg font-display font-bold text-factory-400 tracking-wider">FACTORY MONITOR</h1>
                <p class="text-xs text-gray-500 font-mono">Real-Time Dashboard</p>
              </div>
            </div>
          </div>

          <!-- Status and Time -->
          <div class="flex items-center gap-6">
            <!-- Connection Status -->
            <div class="flex items-center gap-2">
              <div :class="[
                'w-2 h-2 rounded-full',
                sensorsStore.connected ? 'bg-factory-500 animate-pulse' : 'bg-red-500'
              ]"></div>
              <span class="text-xs font-mono" :class="sensorsStore.connected ? 'text-factory-400' : 'text-red-400'">
                {{ connectionStatus }}
              </span>
            </div>

            <!-- Clock -->
            <div class="text-right">
              <p class="text-lg font-mono text-white">{{ currentTime }}</p>
              <p class="text-xs text-gray-500">System Time</p>
            </div>

            <!-- User Menu -->
            <div class="flex items-center gap-3 pl-6 border-l border-industrial-700">
              <div class="text-right">
                <p class="text-sm text-white">{{ authStore.userName }}</p>
                <p class="text-xs text-gray-500 uppercase">{{ authStore.user?.role || 'Operator' }}</p>
              </div>
              <button
                @click="logout"
                class="p-2 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-gray-400 hover:text-white transition-colors"
                title="Logout"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Tab Navigation -->
      <div class="flex gap-2 mb-6">
        <button
          @click="activeTab = 'overview'"
          :class="[
            'px-4 py-2 rounded-lg font-medium text-sm transition-all',
            activeTab === 'overview' 
              ? 'bg-factory-500/20 text-factory-400 border border-factory-500/30' 
              : 'text-gray-400 hover:text-white hover:bg-industrial-800'
          ]"
        >
          Overview
        </button>
        <button
          @click="activeTab = 'charts'"
          :class="[
            'px-4 py-2 rounded-lg font-medium text-sm transition-all',
            activeTab === 'charts' 
              ? 'bg-factory-500/20 text-factory-400 border border-factory-500/30' 
              : 'text-gray-400 hover:text-white hover:bg-industrial-800'
          ]"
        >
          Live Charts
        </button>
        <button
          @click="activeTab = 'history'"
          :class="[
            'px-4 py-2 rounded-lg font-medium text-sm transition-all',
            activeTab === 'history' 
              ? 'bg-factory-500/20 text-factory-400 border border-factory-500/30' 
              : 'text-gray-400 hover:text-white hover:bg-industrial-800'
          ]"
        >
          History
        </button>
      </div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-6 animate-fade-in">
        <!-- Machine Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MachineCard
            v-for="machine in sensorsStore.allMachineData"
            :key="machine.machineId"
            :machine-id="machine.machineId"
            :latest="machine.latest"
          />
        </div>

        <!-- Charts and Video Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Temperature Chart -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Temperature Readings</h3>
              <span class="status-online">Live</span>
            </div>
            <SensorChart
              :sensor-data="sensorsStore.sensorData"
              :machines="sensorsStore.machines"
              data-key="temperature"
              unit="°C"
              :color-scheme="['#22c55e', '#3b82f6', '#f59e0b']"
            />
          </div>

          <!-- Live Video Feed -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Factory Camera Feed</h3>
              <span :class="sensorsStore.videoFrame ? 'status-online' : 'status-offline'">
                {{ sensorsStore.videoFrame ? 'Streaming' : 'No Signal' }}
              </span>
            </div>
            <VideoFeed :frame="sensorsStore.videoFrame" />
          </div>
        </div>

        <!-- Pressure Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Pressure Readings</h3>
            <span class="status-online">Live</span>
          </div>
          <SensorChart
            :sensor-data="sensorsStore.sensorData"
            :machines="sensorsStore.machines"
            data-key="pressure"
            unit="PSI"
            :color-scheme="['#8b5cf6', '#ec4899', '#06b6d4']"
          />
        </div>
      </div>

      <!-- Charts Tab -->
      <div v-if="activeTab === 'charts'" class="space-y-6 animate-fade-in">
        <div v-for="machineId in sensorsStore.machines" :key="machineId" class="card">
          <div class="card-header">
            <h3 class="card-title">{{ machineId }}</h3>
            <span class="status-online">Live</span>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 class="text-sm text-gray-400 mb-3">Temperature</h4>
              <SensorChart
                :sensor-data="{ [machineId]: sensorsStore.sensorData[machineId] || [] }"
                :machines="[machineId]"
                data-key="temperature"
                unit="°C"
                :color-scheme="['#22c55e']"
              />
            </div>
            <div>
              <h4 class="text-sm text-gray-400 mb-3">Pressure</h4>
              <SensorChart
                :sensor-data="{ [machineId]: sensorsStore.sensorData[machineId] || [] }"
                :machines="[machineId]"
                data-key="pressure"
                unit="PSI"
                :color-scheme="['#8b5cf6']"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- History Tab -->
      <div v-if="activeTab === 'history'" class="space-y-6 animate-fade-in">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">1-Minute Averages (PostgreSQL)</h3>
            <button 
              @click="sensorsStore.fetchAggregates()"
              class="btn-secondary text-sm py-1 px-3"
            >
              Refresh
            </button>
          </div>
          <StatsTable :aggregates="sensorsStore.aggregates" />
        </div>
      </div>
    </main>
  </div>
</template>

