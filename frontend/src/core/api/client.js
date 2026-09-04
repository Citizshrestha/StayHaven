import axios from "axios";
import { setupCsrfInterceptor } from "../../utils/csrf";
import { getApiBaseUrl } from "../../utils/apiConfig";

// Singleton refresh promise — prevents concurrent token-rotation races
let activeRefreshPromise = null;

const axiosClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // send cookies
});

// Setup CSRF token interceptor
setupCsrfInterceptor(axiosClient);

axiosClient.interceptors.request.use(
    (config) => {
        // Token selection logic:
        // - Normal users use `accessToken`
        // - Staff endpoints (including superadmin, which logs in via the
        //   same /staff/login flow) prefer `staffAccessToken`
        const url = String(config.url || "");
        const isStaffRequest = url.includes("/api/v1/staff") ||
                              url.includes("/api/v1/reception") ||
                              url.includes("/api/v1/profile") ||
                              url.includes("/api/v1/users/admin") ||
                              url.includes("/api/v1/hotels/admin") ||
                              url.includes("/api/v1/superadmin");

        const staffAccessToken = sessionStorage.getItem("staffAccessToken");
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
        const isStaffRequest = url.includes("/api/v1/staff") ||
                              url.includes("/api/v1/reception") ||
                              url.includes("/api/v1/profile") ||
                              url.includes("/api/v1/users/admin") ||
                              url.includes("/api/v1/hotels/admin") ||
                              url.includes("/api/v1/superadmin");
        const skipRefreshEndpoints = [
            '/api/v1/auth/login',
            '/api/v1/auth/register',
            '/api/v1/auth/google-login',
            '/api/v1/auth/sendResetPasswordOtp',
            '/api/v1/auth/verifyResetPasswordOtp',
            '/api/v1/auth/resetPassword',
            '/api/v1/auth/sendSignupOtp',
            '/api/v1/auth/verifySignupOtp',
            // Token refresh endpoints — never try to refresh a refresh
            '/api/v1/auth/refresh',
            '/api/v1/staff/refresh-token',
            // Staff public endpoints
            '/api/v1/staff/login',
            '/api/v1/staff/forgot-password',
            '/api/v1/staff/reset-password',
            '/api/v1/staff/complete-onboard',
            '/api/v1/staff/verify-invite'
        ];

        const isAuthEndpoint = skipRefreshEndpoints.some(endpoint =>
            originalRequest.url?.includes(endpoint)
        );

        // Determine if user is logged in (staff or normal user)
        const hasStaffSession = !!(sessionStorage.getItem('staffAccessToken'));
        const hasUserSession = !!(localStorage.getItem('accessToken') || localStorage.getItem('userId'));

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
                    ? '/api/v1/staff/refresh-token'
                    : '/api/v1/auth/refresh';

                // Singleton promise: when many parallel requests all 401 at once
                // (e.g. 12 simultaneous getOrders calls), only ONE refresh is made.
                // All 12 callers share the same promise and each retries with the
                // new token once the refresh completes.
                if (!activeRefreshPromise) {
                    activeRefreshPromise = axios.post(
                        getApiBaseUrl() + refreshUrl,
                        {},
                        { withCredentials: true }
                    ).finally(() => { activeRefreshPromise = null; });
                }

                const { data } = await activeRefreshPromise;
                const newAccessToken = data.accessToken;

                // Store in the correct key
                if (isStaffRequest && hasStaffSession) {
                    sessionStorage.setItem('staffAccessToken', newAccessToken);
                } else {
                    localStorage.setItem('accessToken', newAccessToken);
                }

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return axiosClient(originalRequest);
            } catch (refreshErr) {
                // Clear appropriate tokens and redirect to login
                if (isStaffRequest && hasStaffSession) {
                    sessionStorage.removeItem('staffAccessToken');
                    localStorage.removeItem('staffAccessToken');
                    sessionStorage.removeItem('staffUser');
                    sessionStorage.removeItem('staffUserId');
                    sessionStorage.removeItem('staffRole');
                    sessionStorage.removeItem('activeProperty');
                    // Defensive: purge any pre-existing localStorage copies
                    // from before these moved to sessionStorage.
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
