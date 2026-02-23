<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const props = defineProps({
  sensorData: {
    type: Object,
    required: true
  },
  machines: {
    type: Array,
    required: true
  },
  dataKey: {
    type: String,
    default: 'temperature'
  },
  unit: {
    type: String,
    default: '°C'
  },
  colorScheme: {
    type: Array,
    default: () => ['#22c55e', '#3b82f6', '#f59e0b']
  }
});

const chartData = computed(() => {
  // Get all timestamps from all machines
  const allTimestamps = new Set();
  props.machines.forEach(machineId => {
    const data = props.sensorData[machineId] || [];
    data.forEach(point => {
      const time = new Date(point.timestamp).toLocaleTimeString();
      allTimestamps.add(time);
    });
  });

  const labels = Array.from(allTimestamps).slice(-50);

  const datasets = props.machines.map((machineId, index) => {
    const machineData = props.sensorData[machineId] || [];
    const values = machineData.slice(-50).map(point => point[props.dataKey]);
    
    const color = props.colorScheme[index % props.colorScheme.length];
    
    return {
      label: machineId,
      data: values,
      borderColor: color,
      backgroundColor: `${color}20`,
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 4,
    };
  });

  return { labels, datasets };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0
  },
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#94a3b8',
        usePointStyle: true,
        padding: 20,
        font: {
          family: 'JetBrains Mono, monospace',
          size: 11
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      borderWidth: 1,
      padding: 12,
      titleFont: {
        family: 'JetBrains Mono, monospace'
      },
      bodyFont: {
        family: 'JetBrains Mono, monospace'
      },
      callbacks: {
        label: (context) => {
          return `${context.dataset.label}: ${context.parsed.y?.toFixed(1)} ${props.unit}`;
        }
      }
    }
  },
  scales: {
    x: {
      display: true,
      grid: {
        color: 'rgba(148, 163, 184, 0.1)',
        drawBorder: false,
      },
      ticks: {
        color: '#64748b',
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 8,
        font: {
          family: 'JetBrains Mono, monospace',
          size: 10
        }
      }
    },
    y: {
      display: true,
      grid: {
        color: 'rgba(148, 163, 184, 0.1)',
        drawBorder: false,
      },
      ticks: {
        color: '#64748b',
        font: {
          family: 'JetBrains Mono, monospace',
          size: 10
        },
        callback: (value) => `${value} ${props.unit}`
      }
    }
  }
};
</script>

<template>
  <div class="h-64">
    <Line 
      :data="chartData" 
      :options="chartOptions"
    />
  </div>
</template>

