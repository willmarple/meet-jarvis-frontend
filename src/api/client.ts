import axios, { AxiosError } from 'axios'

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api`,
  timeout: 30000, // 30 second timeout for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor for authentication if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common errors globally
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

export default apiClient