<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isLogin = ref(true);
const email = ref('');
const password = ref('');
const name = ref('');

async function handleSubmit() {
  let success;
  
  if (isLogin.value) {
    success = await authStore.login(email.value, password.value);
  } else {
    success = await authStore.signup(email.value, password.value, name.value);
  }
  
  if (success) {
    router.push('/dashboard');
  }
}

function toggleMode() {
  isLogin.value = !isLogin.value;
  authStore.error = null;
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <!-- Background decorations -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-factory-500/5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-factory-600/5 rounded-full blur-3xl"></div>
    </div>

    <div class="w-full max-w-md relative">
      <!-- Logo/Header -->
      <div class="text-center mb-8 animate-fade-in">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-factory-500 to-factory-700 mb-4 glow-green">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 class="text-3xl font-display font-bold text-factory-400 tracking-wider">
          FACTORY MONITOR
        </h1>
        <p class="text-gray-500 mt-2 font-mono text-sm">
          Real-Time Machinery Dashboard
        </p>
      </div>

      <!-- Login Card -->
      <div class="card animate-slide-up" style="animation-delay: 0.1s;">
        <div class="card-header">
          <h2 class="card-title">
            {{ isLogin ? 'System Access' : 'Register Account' }}
          </h2>
          <div class="w-2 h-2 rounded-full bg-factory-500 animate-pulse"></div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Name field (signup only) -->
          <div v-if="!isLogin" class="animate-fade-in">
            <label for="name" class="label">Operator Name</label>
            <input
              id="name"
              v-model="name"
              type="text"
              class="input"
              placeholder="Enter your name"
            />
          </div>

          <!-- Email field -->
          <div>
            <label for="email" class="label">Email Address</label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="input"
              placeholder="operator@factory.io"
              required
            />
          </div>

          <!-- Password field -->
          <div>
            <label for="password" class="label">Access Code</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="input"
              placeholder="••••••••"
              required
              minlength="6"
            />
          </div>

          <!-- Error message -->
          <div v-if="authStore.error" class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p class="text-red-400 text-sm font-mono">
              ⚠️ {{ authStore.error }}
            </p>
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            class="btn-primary w-full flex items-center justify-center gap-2"
            :disabled="authStore.loading"
          >
            <svg v-if="authStore.loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isLogin ? 'Access Dashboard' : 'Create Account' }}</span>
            <svg v-if="!authStore.loading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </form>

        <!-- Toggle mode -->
        <div class="mt-6 pt-4 border-t border-industrial-700/50 text-center">
          <button
            @click="toggleMode"
            class="text-sm text-gray-400 hover:text-factory-400 transition-colors font-mono"
          >
            {{ isLogin ? 'Need an account? Register' : 'Already registered? Login' }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-gray-600 text-xs mt-6 font-mono">
        v1.0.0 • Secure Connection • AES-256
      </p>
    </div>
  </div>
</template>

