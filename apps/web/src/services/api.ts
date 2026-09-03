import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  ApiResponse,
  UserProfile,
  AddressDto,
  ShipmentDto,
  ShippingQuoteRequest,
  ShippingQuoteResponse,
  PublicTrackingResponse,
  DeliveryTaskDto,
  DeliveryPartnerDto,
  ShipmentExceptionDto,
  ReturnOrderDto,
} from '@courier/types';
import type { RegisterInput, LoginInput, AddressInput, CreateShipmentInput } from '@courier/shared';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

const ACCESS_TOKEN_KEY = 'courier_access_token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(ACCESS_TOKEN_KEY),
};

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with rotation & refresh queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data?.data?.accessToken;
        if (newAccessToken) {
          tokenStorage.set(newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr as AxiosError, null);
        tokenStorage.clear();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ==========================================
// API MODULE EXPORTS
// ==========================================

export const authApi = {
  login: (input: LoginInput) => apiClient.post<ApiResponse<{ user: UserProfile; accessToken: string }>>('/auth/login', input),
  register: (input: RegisterInput) => apiClient.post<ApiResponse<{ user: UserProfile; accessToken: string }>>('/auth/register', input),
  logout: () => apiClient.post<ApiResponse<null>>('/auth/logout'),
  logoutAll: () => apiClient.post<ApiResponse<null>>('/auth/logout-all'),
  getMe: () => apiClient.get<ApiResponse<UserProfile>>('/auth/me'),
  forgotPassword: (email: string) => apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => apiClient.post<ApiResponse<null>>('/auth/reset-password', { token, newPassword }),
  listSessions: () => apiClient.get<ApiResponse<any[]>>('/auth/sessions'),
  revokeSession: (id: string) => apiClient.delete<ApiResponse<null>>(`/auth/sessions/${id}`),
};

export const usersApi = {
  getProfile: () => apiClient.get<ApiResponse<UserProfile>>('/users/me'),
  updateProfile: (data: Partial<UserProfile>) => apiClient.patch<ApiResponse<UserProfile>>('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => apiClient.post<ApiResponse<null>>('/users/change-password', data),
  getAddresses: () => apiClient.get<ApiResponse<AddressDto[]>>('/users/addresses'),
  createAddress: (data: AddressInput) => apiClient.post<ApiResponse<AddressDto>>('/users/addresses', data),
  updateAddress: (id: string, data: Partial<AddressInput>) => apiClient.put<ApiResponse<AddressDto>>(`/users/addresses/${id}`, data),
  deleteAddress: (id: string) => apiClient.delete<ApiResponse<null>>(`/users/addresses/${id}`),
  setDefaultAddress: (id: string) => apiClient.patch<ApiResponse<AddressDto>>(`/users/addresses/${id}/default`),
  listUsers: (params?: any) => apiClient.get<ApiResponse<any>>('/users/admin/users', { params }),
  updateUserStatus: (id: string, isActive: boolean) => apiClient.patch<ApiResponse<null>>(`/users/admin/users/${id}/status`, { isActive }),
};

export const pricingApi = {
  getQuote: (data: ShippingQuoteRequest) => apiClient.post<ApiResponse<ShippingQuoteResponse>>('/pricing/quote', data),
  checkPincode: (pincode: string) => apiClient.get<ApiResponse<any>>(`/pricing/serviceability/${pincode}`),
  listZones: () => apiClient.get<ApiResponse<any[]>>('/pricing/admin/zones'),
  listRateCards: () => apiClient.get<ApiResponse<any[]>>('/pricing/admin/rate-cards'),
  listServiceability: (params?: any) => apiClient.get<ApiResponse<any>>('/pricing/admin/serviceability', { params }),
};

export const shipmentsApi = {
  createShipment: (data: CreateShipmentInput) => apiClient.post<ApiResponse<ShipmentDto>>('/shipments', data),
  listShipments: (params?: any) => apiClient.get<ApiResponse<{ items: ShipmentDto[]; total: number; totalPages: number }>>('/shipments', { params }),
  getShipmentById: (id: string) => apiClient.get<ApiResponse<ShipmentDto>>(`/shipments/${id}`),
  cancelShipment: (id: string, reason?: string) => apiClient.patch<ApiResponse<ShipmentDto>>(`/shipments/${id}/cancel`, { reason }),
  updateStatus: (id: string, data: { status: string; description?: string; location?: string }) => apiClient.patch<ApiResponse<ShipmentDto>>(`/shipments/${id}/status`, data),
};

export const pickupApi = {
  schedulePickup: (data: any) => apiClient.post<ApiResponse<any>>('/pickups/schedule', data),
  reschedulePickup: (id: string, data: any) => apiClient.patch<ApiResponse<any>>(`/pickups/${id}/reschedule`, data),
  recordAttempt: (id: string, data: any) => apiClient.post<ApiResponse<any>>(`/pickups/${id}/attempts`, data),
  listPickups: (params?: any) => apiClient.get<ApiResponse<any>>('/pickups', { params }),
};

export const deliveryApi = {
  scheduleDelivery: (data: any) => apiClient.post<ApiResponse<any>>('/deliveries/schedule', data),
  recordAttempt: (id: string, data: any) => apiClient.post<ApiResponse<any>>(`/deliveries/${id}/attempts`, data),
  listDeliveries: (params?: any) => apiClient.get<ApiResponse<any>>('/deliveries', { params }),
};

export const partnerApi = {
  getMyProfile: () => apiClient.get<ApiResponse<DeliveryPartnerDto>>('/delivery-partners/me'),
  updateAvailability: (availabilityStatus: string) => apiClient.patch<ApiResponse<any>>('/delivery-partners/availability', { availabilityStatus }),
  listTasks: (params?: any) => apiClient.get<ApiResponse<any>>('/delivery-partners/tasks', { params }),
  updateTaskStatus: (id: string, data: any) => apiClient.patch<ApiResponse<any>>(`/delivery-partners/tasks/${id}`, data),
  listAllPartners: (params?: any) => apiClient.get<ApiResponse<DeliveryPartnerDto[]>>('/delivery-partners/admin', { params }),
  assignTask: (data: any) => apiClient.post<ApiResponse<any>>('/delivery-partners/admin/assign', data),
};

export const adminApi = {
  getDashboardSummary: (startDate?: string, endDate?: string) => apiClient.get<ApiResponse<any>>('/admin/dashboard/summary', { params: { startDate, endDate } }),
  globalSearch: (q: string) => apiClient.get<ApiResponse<any>>('/admin/search', { params: { q } }),
  listExceptions: (params?: any) => apiClient.get<ApiResponse<ShipmentExceptionDto[]>>('/admin/exceptions', { params }),
  resolveException: (id: string, resolutionNotes: string) => apiClient.patch<ApiResponse<null>>(`/admin/exceptions/${id}/resolve`, { resolutionNotes }),
  listActivity: (limit?: number) => apiClient.get<ApiResponse<any[]>>('/admin/activity', { params: { limit } }),
  getSystemHealth: () => apiClient.get<ApiResponse<any>>('/admin/system-health'),
};

export const paymentsApi = {
  createOrder: (shipmentId: string) => apiClient.post<ApiResponse<any>>('/payments/orders', { shipmentId }),
  verifyPayment: (paymentOrderId: string, providerTransactionId: string) => apiClient.post<ApiResponse<any>>('/payments/verify', { paymentOrderId, providerTransactionId }),
  recordCodCollection: (shipmentId: string, data: any) => apiClient.post<ApiResponse<any>>(`/payments/cod/${shipmentId}/collect`, data),
  requestRefund: (data: { paymentOrderId: string; amount: number; reason: string }) => apiClient.post<ApiResponse<any>>('/payments/admin/refund', data),
  listPaymentOrders: (params?: any) => apiClient.get<ApiResponse<any>>('/payments/admin/orders', { params }),
  listCodOrders: () => apiClient.get<ApiResponse<any[]>>('/payments/admin/cod'),
};

export const returnsApi = {
  createReturn: (data: { shipmentId: string; reason: string; comment?: string }) => apiClient.post<ApiResponse<ReturnOrderDto>>('/returns', data),
  listReturns: (params?: any) => apiClient.get<ApiResponse<any>>('/returns', { params }),
  getReturnById: (id: string) => apiClient.get<ApiResponse<any>>(`/returns/${id}`),
  approveReturn: (id: string) => apiClient.patch<ApiResponse<any>>(`/returns/admin/${id}/approve`),
  rejectReturn: (id: string, reason?: string) => apiClient.patch<ApiResponse<any>>(`/returns/admin/${id}/reject`, { reason }),
  recordInspection: (id: string, data: any) => apiClient.post<ApiResponse<any>>(`/returns/admin/${id}/inspection`, data),
  initiateRTO: (shipmentId: string, reason?: string) => apiClient.post<ApiResponse<any>>(`/returns/admin/shipments/${shipmentId}/rto`, { reason }),
};

export const trackingApi = {
  getTracking: (trackingNumber: string) => apiClient.get<ApiResponse<PublicTrackingResponse>>(`/tracking/${trackingNumber}`),
};
