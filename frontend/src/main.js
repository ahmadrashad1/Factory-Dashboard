/**
 * Factory Monitor - Vue.js 3 Application
 * =======================================
 * Main entry point
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';

import './style.css';

const app = createApp(App);

// State management
app.use(createPinia());

// Routing
app.use(router);

// Mount application
app.mount('#app');

