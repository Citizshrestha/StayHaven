import axios from "axios";

// Singleton refresh promise — prevents concurrent token-rotation races
let activeRefreshPromise = null;

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // send cookies
});

axiosClient.interceptors.request.use(
    (config) => {
        // Token selection logic:
        // - Normal users use `accessToken`
        // - Staff endpoints should prefer `staffAccessToken`
        const url = String(config.url || "");
        const isStaffRequest = url.includes("/api/staff") || url.includes("/api/reception");

        const staffAccessToken = localStorage.getItem("staffAccessToken");
        const accessToken = localStorage.getItem('accessToken');

        const tokenToUse = isStaffRequest
            ? (staffAccessToken || accessToken)
            : accessToken;

        if (tokenToUse) {
            config.headers.Authorization = `Bearer ${tokenToUse}`;
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
        const url = String(originalRequest.url || "");
        const isStaffRequest = url.includes("/api/staff") || url.includes("/api/reception");
        const skipRefreshEndpoints = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/google-login',
            '/api/auth/sendResetPasswordOtp',
            '/api/auth/verifyResetPasswordOtp',
            '/api/auth/resetPassword',
            '/api/auth/sendSignupOtp',
            '/api/auth/verifySignupOtp',
            // Token refresh endpoints — never try to refresh a refresh
            '/api/auth/refresh',
            '/api/staff/refresh-token',
            // Staff public endpoints
            '/api/staff/login',
            '/api/staff/forgot-password',
            '/api/staff/reset-password',
            '/api/staff/complete-onboard',
            '/api/staff/verify-invite'
        ];

        const isAuthEndpoint = skipRefreshEndpoints.some(endpoint =>
            originalRequest.url?.includes(endpoint)
        );

        // Determine if user is logged in (staff or normal user)
        const hasStaffSession = !!localStorage.getItem('staffAccessToken');
        const hasUserSession = !!localStorage.getItem('userId');

        // Only attempt refresh if:
        // 1. It's a 401 error
        // 2. It's not already retrying
        // 3. It's not an auth endpoint (login/register)
        // 4. We have a session (staff or user)
        if (error.response?.status === 401 &&
            !originalRequest._retry &&
            !isAuthEndpoint &&
            (hasStaffSession || hasUserSession)) {

            originalRequest._retry = true;

            try {
                // Choose refresh endpoint based on request type
                const refreshUrl = isStaffRequest && hasStaffSession
                    ? '/api/staff/refresh-token'
                    : '/api/auth/refresh';

                // Singleton promise: when many parallel requests all 401 at once
                // (e.g. 12 simultaneous getOrders calls), only ONE refresh is made.
                // All 12 callers share the same promise and each retries with the
                // new token once the refresh completes.
                if (!activeRefreshPromise) {
                    activeRefreshPromise = axios.post(
                        import.meta.env.VITE_API_BASE_URL + refreshUrl,
                        {},
                        { withCredentials: true }
                    ).finally(() => { activeRefreshPromise = null; });
                }

                const { data } = await activeRefreshPromise;
                const newAccessToken = data.accessToken;

                // Store in the correct key
                if (isStaffRequest && hasStaffSession) {
                    localStorage.setItem('staffAccessToken', newAccessToken);
                } else {
                    localStorage.setItem('accessToken', newAccessToken);
                }

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return axiosClient(originalRequest);
            } catch (refreshErr) {
                // Clear appropriate tokens and redirect to login
                if (isStaffRequest && hasStaffSession) {
                    localStorage.removeItem('staffAccessToken');
                    localStorage.removeItem('staffUser');
                    localStorage.removeItem('staffUserId');
                    localStorage.removeItem('staffRole');
                    localStorage.removeItem('activeProperty');
                    localStorage.removeItem('restaurant_orders');
                    if (!window.location.pathname.includes('/staff/login')) {
                        window.location.href = "/staff/login";
                    }
                } else if (localStorage.getItem('accessToken')) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('userId');
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
