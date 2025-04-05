const config = {
  development: {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
  },
  production: {
    apiUrl: import.meta.env.VITE_API_URL || 'http://3.90.206.40:8000',
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://3.90.206.40:8000'
  }
};

// Use development config by default, or production if VITE_ENV is set to 'production'
const env = import.meta.env.VITE_ENV === 'production' ? 'production' : 'development';
export default config[env]; 