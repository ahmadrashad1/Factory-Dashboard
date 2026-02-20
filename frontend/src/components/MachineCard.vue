<script setup>
import { computed } from 'vue';

const props = defineProps({
  machineId: {
    type: String,
    required: true
  },
  latest: {
    type: Object,
    default: null
  }
});

const machineNumber = computed(() => props.machineId.split('-')[1]);

const isOnline = computed(() => !!props.latest);

const temperature = computed(() => props.latest?.temperature?.toFixed(1) || '--');
const pressure = computed(() => props.latest?.pressure?.toFixed(1) || '--');

// Determine status based on values
const tempStatus = computed(() => {
  if (!props.latest) return 'offline';
  const temp = props.latest.temperature;
  if (temp > 90) return 'critical';
  if (temp > 80) return 'warning';
  return 'normal';
});

const pressStatus = computed(() => {
  if (!props.latest) return 'offline';
  const press = props.latest.pressure;
  if (press > 130) return 'critical';
  if (press > 115) return 'warning';
  return 'normal';
});
</script>

<template>
  <div 
    class="card relative overflow-hidden group"
    :class="{ 'animate-pulse-green': isOnline }"
  >
    <!-- Status indicator corner -->
    <div 
      class="absolute top-0 right-0 w-16 h-16 overflow-hidden"
    >
      <div 
        :class="[
          'absolute transform rotate-45 w-24 h-6 -right-6 top-4 flex items-center justify-center text-xs font-bold',
          isOnline ? 'bg-factory-500 text-white' : 'bg-gray-600 text-gray-300'
        ]"
      >
        {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
      </div>
    </div>

    <!-- Machine Header -->
    <div class="flex items-center gap-4 mb-6">
      <div 
        :class="[
          'w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-display font-bold',
          isOnline 
            ? 'bg-gradient-to-br from-factory-500/20 to-factory-600/20 text-factory-400 border border-factory-500/30' 
            : 'bg-industrial-800 text-gray-500 border border-industrial-700'
        ]"
      >
        {{ machineNumber }}
      </div>
      <div>
        <h3 class="text-lg font-display font-bold text-white tracking-wide">
          {{ machineId }}
        </h3>
        <p class="text-xs text-gray-500 font-mono">
          {{ isOnline ? 'Operational' : 'No Data' }}
        </p>
      </div>
    </div>

    <!-- Metrics -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Temperature -->
      <div class="bg-industrial-800/50 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs text-gray-400 uppercase tracking-wider">Temperature</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span 
            :class="[
              'text-2xl font-mono font-bold',
              tempStatus === 'critical' ? 'text-red-400' :
              tempStatus === 'warning' ? 'text-amber-400' :
              tempStatus === 'normal' ? 'text-factory-400' : 'text-gray-500'
            ]"
          >
            {{ temperature }}
          </span>
          <span class="text-sm text-gray-500">°C</span>
        </div>
        
        <!-- Status bar -->
        <div class="mt-2 h-1 bg-industrial-700 rounded-full overflow-hidden">
          <div 
            :class="[
              'h-full rounded-full transition-all duration-500',
              tempStatus === 'critical' ? 'bg-red-500' :
              tempStatus === 'warning' ? 'bg-amber-500' :
              tempStatus === 'normal' ? 'bg-factory-500' : 'bg-gray-600'
            ]"
            :style="{ width: latest ? `${Math.min((latest.temperature / 100) * 100, 100)}%` : '0%' }"
          ></div>
        </div>
      </div>

      <!-- Pressure -->
      <div class="bg-industrial-800/50 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="text-xs text-gray-400 uppercase tracking-wider">Pressure</span>
        </div>
        <div class="flex items-baseline gap-1">
          <span 
            :class="[
              'text-2xl font-mono font-bold',
              pressStatus === 'critical' ? 'text-red-400' :
              pressStatus === 'warning' ? 'text-amber-400' :
              pressStatus === 'normal' ? 'text-purple-400' : 'text-gray-500'
            ]"
          >
            {{ pressure }}
          </span>
          <span class="text-sm text-gray-500">PSI</span>
        </div>
        
        <!-- Status bar -->
        <div class="mt-2 h-1 bg-industrial-700 rounded-full overflow-hidden">
          <div 
            :class="[
              'h-full rounded-full transition-all duration-500',
              pressStatus === 'critical' ? 'bg-red-500' :
              pressStatus === 'warning' ? 'bg-amber-500' :
              pressStatus === 'normal' ? 'bg-purple-500' : 'bg-gray-600'
            ]"
            :style="{ width: latest ? `${Math.min((latest.pressure / 150) * 100, 100)}%` : '0%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Timestamp -->
    <div v-if="latest?.timestamp" class="mt-4 text-center">
      <span class="text-xs text-gray-500 font-mono">
        Last update: {{ new Date(latest.timestamp).toLocaleTimeString() }}
      </span>
    </div>

    <!-- Hover effect glow -->
    <div 
      v-if="isOnline"
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      style="box-shadow: inset 0 0 30px rgba(34, 197, 94, 0.1);"
    ></div>
  </div>
</template>

