/**
 * Auth Store
 * ==========
 * Manages user authentication state
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null);
  const token = ref(localStorage.getItem('token'));
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const isAuthenticated = computed(() => !!token.value);
  const userName = computed(() => user.value?.name || user.value?.email || 'User');

  // Actions
  async function login(email, password) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post('/api/auth/login', { email, password });
      
      token.value = response.data.token;
      user.value = response.data.user;
      
      localStorage.setItem('token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      return true;
    } catch (err) {
      error.value = err.response?.data?.message || 'Login failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function signup(email, password, name) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post('/api/auth/signup', { email, password, name });
      
      token.value = response.data.token;
      user.value = response.data.user;
      
      localStorage.setItem('token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      return true;
    } catch (err) {
      error.value = err.response?.data?.message || 'Signup failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser() {
    if (!token.value) return;

    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
      const response = await api.get('/api/auth/me');
      user.value = response.data.user;
    } catch (err) {
      // Token invalid, logout
      logout();
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }

  // Initialize - set auth header if token exists
  if (token.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
    fetchUser();
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    // Getters
    isAuthenticated,
    userName,
    // Actions
    login,
    signup,
    logout,
    fetchUser,
  };
});

