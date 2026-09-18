import axios from "axios";
export const api = axios.create({
baseURL: import.meta.env.VITE_API_URL,
});

// Attach the saved token to every outgoing request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("moha_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend ever says the token is invalid/expired, log the user out automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't trigger auto-logout and page reload for login failures
      if (error.config && !error.config.url?.includes("/auth/login")) {
        localStorage.removeItem("moha_token");
        localStorage.removeItem("moha_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);