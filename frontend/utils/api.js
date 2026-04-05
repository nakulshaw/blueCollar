import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://10.51.199.59:5000/api', // Replaced with LAN IP for Expo Go
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to attach the token if available
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
