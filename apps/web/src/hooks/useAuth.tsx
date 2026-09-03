import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, tokenStorage } from '../services/api';
import type { UserProfile, ApiResponse, AuthResponseData } from '@courier/types';
import type { LoginInput, RegisterInput } from '@courier/shared';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<UserProfile>;
  register: (data: RegisterInput) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current user on mount if token is saved
  const refreshProfile = async () => {
    const token = tokenStorage.get();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<ApiResponse<{ user: UserProfile }>>('/auth/me');
      if (response.data?.data?.user) {
        setUser(response.data.data.user);
      }
    } catch {
      tokenStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (credentials: LoginInput): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', credentials);
      const data = response.data?.data;
      if (!data) {
        throw new Error(response.data?.message || 'Login failed');
      }

      tokenStorage.set(data.accessToken);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', data);
      const resData = response.data?.data;
      if (!resData) {
        throw new Error(response.data?.message || 'Registration failed');
      }

      tokenStorage.set(resData.accessToken);
      setUser(resData.user);
      return resData.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
