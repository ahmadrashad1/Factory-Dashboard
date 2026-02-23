<script setup>
import { computed } from 'vue';

const props = defineProps({
  aggregates: {
    type: Array,
    default: () => []
  }
});

const formattedData = computed(() => {
  return props.aggregates.map(agg => ({
    ...agg,
    periodTime: new Date(agg.periodEnd).toLocaleString(),
    avgTemp: agg.avgTemperature?.toFixed(1),
    minTemp: agg.minTemperature?.toFixed(1),
    maxTemp: agg.maxTemperature?.toFixed(1),
    avgPress: agg.avgPressure?.toFixed(1),
    minPress: agg.minPressure?.toFixed(1),
    maxPress: agg.maxPressure?.toFixed(1),
  }));
});
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="border-b border-industrial-700">
          <th class="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Machine
          </th>
          <th class="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Time Period
          </th>
          <th class="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Avg Temp
          </th>
          <th class="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Min/Max Temp
          </th>
          <th class="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Avg Pressure
          </th>
          <th class="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Min/Max Press
          </th>
          <th class="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Points
          </th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="(row, index) in formattedData" 
          :key="row.id"
          class="border-b border-industrial-800 hover:bg-industrial-800/50 transition-colors"
          :class="{ 'animate-fade-in': true }"
          :style="{ animationDelay: `${index * 30}ms` }"
        >
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-factory-500"></div>
              <span class="font-mono text-sm text-white">{{ row.machineId }}</span>
            </div>
          </td>
          <td class="py-3 px-4 font-mono text-sm text-gray-400">
            {{ row.periodTime }}
          </td>
          <td class="py-3 px-4 text-right font-mono text-sm">
            <span class="text-factory-400">{{ row.avgTemp }}°C</span>
          </td>
          <td class="py-3 px-4 text-right font-mono text-xs text-gray-500">
            {{ row.minTemp }} / {{ row.maxTemp }}°C
          </td>
          <td class="py-3 px-4 text-right font-mono text-sm">
            <span class="text-purple-400">{{ row.avgPress }} PSI</span>
          </td>
          <td class="py-3 px-4 text-right font-mono text-xs text-gray-500">
            {{ row.minPress }} / {{ row.maxPress }} PSI
          </td>
          <td class="py-3 px-4 text-right font-mono text-sm text-gray-400">
            {{ row.dataPoints }}
          </td>
        </tr>
        
        <!-- Empty State -->
        <tr v-if="formattedData.length === 0">
          <td colspan="7" class="py-12 text-center">
            <div class="flex flex-col items-center gap-3">
              <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-gray-500 font-mono">No aggregate data available</p>
              <p class="text-gray-600 text-sm">Data will appear after the first minute of operation</p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

