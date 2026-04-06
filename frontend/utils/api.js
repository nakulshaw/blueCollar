import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  // REPLACE THIS with your hosted backend URL once deployed (e.g. https://blue-collar-api.onrender.com/api)
  baseURL: 'https://bluecollar-oos6.onrender.com/api',
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
