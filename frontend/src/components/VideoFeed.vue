<script setup>
import { computed } from 'vue';

const props = defineProps({
  frame: {
    type: Object,
    default: null
  }
});

const imageSrc = computed(() => {
  if (props.frame?.data) {
    return `data:image/jpeg;base64,${props.frame.data}`;
  }
  return null;
});
</script>

<template>
  <div class="relative aspect-video bg-industrial-800 rounded-lg overflow-hidden">
    <!-- Video Frame -->
    <img 
      v-if="imageSrc"
      :src="imageSrc"
      alt="Factory Camera Feed"
      class="w-full h-full object-cover"
    />
    
    <!-- No Signal State -->
    <div 
      v-else
      class="absolute inset-0 flex flex-col items-center justify-center"
    >
      <div class="relative">
        <!-- Animated rings -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-20 h-20 rounded-full border-2 border-gray-700 animate-ping opacity-20"></div>
        </div>
        
        <!-- Camera icon -->
        <div class="w-16 h-16 rounded-full bg-industrial-700 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      
      <p class="mt-4 text-gray-500 font-mono text-sm">NO SIGNAL</p>
      <p class="text-gray-600 text-xs mt-1">Waiting for camera feed...</p>
    </div>

    <!-- Overlay Elements -->
    <div v-if="imageSrc" class="absolute inset-0 pointer-events-none">
      <!-- Top bar -->
      <div class="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span class="text-white text-xs font-mono">REC</span>
          </div>
          <span class="text-white text-xs font-mono">CAM-01</span>
        </div>
      </div>
      
      <!-- Bottom bar -->
      <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
        <div class="flex items-center justify-between">
          <span class="text-white text-xs font-mono">
            {{ frame?.width }}x{{ frame?.height }}
          </span>
          <span class="text-factory-400 text-xs font-mono">
            {{ new Date(frame?.timestamp).toLocaleTimeString() }}
          </span>
        </div>
      </div>

      <!-- Scanline effect -->
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent animate-pulse opacity-50"></div>
      
      <!-- Corner brackets -->
      <div class="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-factory-500/50"></div>
      <div class="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-factory-500/50"></div>
      <div class="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-factory-500/50"></div>
      <div class="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-factory-500/50"></div>
    </div>
  </div>
</template>

