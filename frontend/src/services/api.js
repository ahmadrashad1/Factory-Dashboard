/**
 * API Service
 * ===========
 * Axios instance configured for the backend API
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Simple fetch-based API client
const api = {
  defaults: {
    headers: {
      common: {},
    },
  },

  async request(method, url, data = null, config = {}) {
    const fullUrl = `${API_URL}${url}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...this.defaults.headers.common,
      ...config.headers,
    };

    const options = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    // Handle query params
    let finalUrl = fullUrl;
    if (config.params) {
      const searchParams = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        finalUrl += `?${queryString}`;
      }
    }

    const response = await fetch(finalUrl, options);
    
    const responseData = await response.json();

    if (!response.ok) {
      const error = new Error(responseData.message || 'Request failed');
      error.response = { data: responseData, status: response.status };
      throw error;
    }

    return { data: responseData, status: response.status };
  },

  get(url, config = {}) {
    return this.request('GET', url, null, config);
  },

  post(url, data, config = {}) {
    return this.request('POST', url, data, config);
  },

  put(url, data, config = {}) {
    return this.request('PUT', url, data, config);
  },

  delete(url, config = {}) {
    return this.request('DELETE', url, null, config);
  },
};

export default api;

