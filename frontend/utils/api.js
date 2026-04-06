import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  // REMOTE: 'https://bluecollar-oos6.onrender.com/api'
  // LOCAL: 'http://localhost:5000/api' or 'http://10.0.2.2:5000/api'
  baseURL: 'https://bluecollar-oos6.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to attach the token if available
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
