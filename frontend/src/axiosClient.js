import axios from "axios";

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // send cookies
});

axiosClient.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor to handle token refresh on 401 errors
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Skip token refresh for login/register/password reset/signup OTP endpoints
        const skipRefreshEndpoints = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/google-login',
            '/api/auth/sendResetPasswordOtp',
            '/api/auth/verifyResetPasswordOtp',
            '/api/auth/resetPassword',
            '/api/auth/sendSignupOtp',
            '/api/auth/verifySignupOtp'
        ];
        
        const isAuthEndpoint = skipRefreshEndpoints.some(endpoint => 
            originalRequest.url?.includes(endpoint)
        );
        
        // Only attempt refresh if:
        // 1. It's a 401 error
        // 2. It's not already retrying
        // 3. It's not an auth endpoint (login/register)
        // 4. We have a userId in localStorage (indicating previous login)
        if (error.response?.status === 401 && 
            !originalRequest._retry && 
            !isAuthEndpoint && 
            localStorage.getItem('userId')) {
            
            originalRequest._retry = true;

            try {
                // Use axios directly to avoid interceptor loop
                const { data } = await axios.post(import.meta.env.VITE_API_BASE_URL + '/api/auth/refresh', {}, {
                    withCredentials: true // Ensure cookies are sent for refresh
                });
                
                const newAccessToken = data.accessToken;
                localStorage.setItem('accessToken', newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return axiosClient(originalRequest);
            } catch (refreshErr) {
                // Only clear tokens and redirect if we were previously logged in
                if (localStorage.getItem('accessToken')) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('userId');
                    // Only redirect if not already on login page
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = "/";
                    }
                }
                return Promise.reject(refreshErr);
            }
        }
        
        return Promise.reject(error);
    }
);

export default axiosClient;
