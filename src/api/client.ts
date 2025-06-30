import axios, { AxiosError } from 'axios'

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api`,
  timeout: 30000, // 30 second timeout for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
})

// Function to create an authenticated API client with Clerk token
export const createAuthenticatedApiClient = async (getToken?: () => Promise<string | null>) => {
  const client = axios.create({
    baseURL: `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Add auth token if getToken function is provided
  if (getToken) {
    try {
      const token = await getToken()
      if (token) {
        client.defaults.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error)
    }
  }

  return client
}

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // Note: Authentication tokens should be added by the calling code
    // using either the createAuthenticatedApiClient function or by 
    // manually setting the Authorization header
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