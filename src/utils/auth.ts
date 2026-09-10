// src/utils/auth.ts

// 10 minutes in milliseconds
const SESSION_DURATION_MS = 10 * 60 * 1000; 

export const setSession = (token: string) => {
  const expiry = new Date().getTime() + SESSION_DURATION_MS;
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_expiry', expiry.toString());
};

export const clearSession = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_expiry');
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('auth_token');
  const expiry = localStorage.getItem('auth_expiry');
  
  if (!token || !expiry) {
    return false;
  }
  
  // Check if current time has passed the expiration timestamp
  if (new Date().getTime() > parseInt(expiry, 10)) {
    clearSession();
    return false; 
  }
  
  return true;
};
