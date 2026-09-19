// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  birthDate: string;
  gender: string;
  facebook: string;
  membershipTier: string;
  accountStatus: string;
  isVerified: boolean;
  is_admin?: boolean;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: any;
  userId?: string;
  _id?: string;
  token?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (userData: any) => Promise<AuthResponse>;
  logout: () => void;
  deleteAccount: () => Promise<AuthResponse>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🔥 DYNAMIC PERMANENT FIX for Auth (Includes /api/v1/auth prefix)
// 🔥 DYNAMIC PERMANENT FIX for Auth (Cleaned single slash)
const getApiBaseUrl = () => {
  return 'https://cc-backend-production-00fe.up.railway.app/api/v1/auth';
};

const API_BASE_URL = getApiBaseUrl();

// 🛠️ Helper function to safely pull error messages from FastAPI responses
const extractErrorMessage = (data: any, fallback: string): string => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
  }
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  return fallback;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = (includeAuth = true) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (includeAuth) {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }
    }
    return headers;
  };

  const parseResponse = async (response: Response) => {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { detail: text || 'Server error (Status ' + response.status + ')' };
    }
  };

  const normalizeUser = (data: any, fallbackEmail = ''): User => {
    const source = data.user ? data.user : data;

    return {
      id: source.id || source._id || '',
      fullName: source.fullName || '',
      username: source.username || '',
      email: source.email || fallbackEmail || '',
      mobile: source.mobile || '',
      birthDate: source.birthDate || '',
      gender: source.gender || 'Other',
      facebook: source.facebook || '',
      membershipTier: source.membershipTier || 'CC Prime',
      accountStatus: source.accountStatus || source.status || 'Active',
      isVerified: !!source.isVerified,
      is_admin: !!source.is_admin,
    };
  };

  // 🚀 Clears storage, resets state, and redirects user to login
  const logout = useCallback(() => {
    console.log('[AuthContext] Session ended. Clearing storage and redirecting...');
    localStorage.removeItem('userProfileData');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('orders');
    localStorage.removeItem('cart');

    setUser(null);
    setIsAuthenticated(false);
    setError(null);

    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(API_BASE_URL + '/profile', {
        method: 'GET',
        signal: controller.signal,
        headers: getAuthHeaders(),
      });
      clearTimeout(timeoutId);

      const data = await parseResponse(response);

      // 🚀 If user was deleted or token is invalid, auto-logout immediately
      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          console.warn('[AuthContext] Account deleted or session expired. Logging out.');
          logout();
          return;
        }
        const msg = extractErrorMessage(data, 'Server status: ' + response.status);
        throw new Error(msg);
      }

      const updatedUser = normalizeUser(data);
      localStorage.setItem('userProfileData', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsAuthenticated(true);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Connection timed out.');
      } else {
        console.error('[AuthContext] Refresh error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Restore session & verify with backend on startup
  useEffect(() => {
    const storedUser = localStorage.getItem('userProfileData');
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');

    if (storedUser && token) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setIsAuthenticated(true);
      } catch (err) {
        logout();
      }
    }

    // Verify user validity live against backend
    refreshUser();

    // Listen for custom session expiration events
    const handleSessionExpired = () => logout();
    window.addEventListener('user_session_expired', handleSessionExpired);

    return () => {
      window.removeEventListener('user_session_expired', handleSessionExpired);
    };
  }, [logout, refreshUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(API_BASE_URL + '/login', {
          method: 'POST',
          signal: controller.signal,
          headers: getAuthHeaders(false),
          body: JSON.stringify({ email, password }),
        });
        clearTimeout(timeoutId);

        const data = await parseResponse(response);

        if (!response.ok) {
          const msg = extractErrorMessage(data, 'Login failed (' + response.status + ')');
          setError(msg);
          return { success: false, message: msg };
        }

        const token = data.token || data.access_token;
        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('access_token', token);

          const userData = normalizeUser(data, email);
          localStorage.setItem('userProfileData', JSON.stringify(userData));
          setUser(userData);
          setIsAuthenticated(true);

          return { success: true, user: userData, token };
        }

        return { success: false, message: 'Login failed. No token received.' };
      } catch (err: any) {
        const msg =
          err.name === 'AbortError'
            ? 'Connection timed out.'
            : err.message || 'Server unreachable.';
        setError(msg);
        return { success: false, message: msg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (userData: any): Promise<AuthResponse> => {
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(API_BASE_URL + '/register', {
          method: 'POST',
          signal: controller.signal,
          headers: getAuthHeaders(false),
          body: JSON.stringify(userData),
        });
        clearTimeout(timeoutId);

        const data = await parseResponse(response);

        if (!response.ok) {
          const msg = extractErrorMessage(
            data,
            'Registration failed (' + response.status + ')'
          );
          setError(msg);
          return { success: false, message: msg };
        }

        return {
          success: true,
          user: data.user || data,
          userId: data.userId || data._id || data.user?._id || data.user?.id,
          _id: data._id || data.user?._id || data.user?.id,
        };
      } catch (err: any) {
        const msg =
          err.name === 'AbortError'
            ? 'Connection timed out.'
            : err.message || 'Registration failed.';
        setError(msg);
        return { success: false, message: msg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 🚀 Action to delete the current user's account and associated orders
  const deleteAccount = useCallback(async (): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL + '/me', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await parseResponse(response);

      if (!response.ok) {
        const msg = extractErrorMessage(data, 'Failed to delete account');
        setError(msg);
        return { success: false, message: msg };
      }

      // Automatically log out and purge session data upon successful deletion
      logout();
      return { success: true, message: 'Account deleted successfully' };
    } catch (err: any) {
      const msg = err.message || 'Failed to delete account.';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        error,
        login,
        register,
        logout,
        deleteAccount,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
