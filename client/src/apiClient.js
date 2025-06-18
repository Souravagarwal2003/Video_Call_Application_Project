// src/utils/axios.js
import axios from 'axios';

// Create an instance of Axios
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // This ensures cookies are sent with requests
});

// Optionally, you can add request and response interceptors
apiClient.interceptors.request.use(
  (config) => {
    // You can add authorization headers or other configurations here
    //config.headers['Authorization'] = `Bearer ${yourToken}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors globally here
    return Promise.reject(error);
  }
);

export default apiClient;