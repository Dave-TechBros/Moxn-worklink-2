import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, CandidateProfile, Company } from '../types';

interface AuthContextType {
  currentUser: User | null;
  currentProfile: CandidateProfile | null;
  currentCompany: Company | null;
  availableUsers: User[];
  loading: boolean;
  switchUser: (userId: string) => Promise<void>;
  loginWithEmail: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (data: {
    name: string;
    email: string;
    password?: string;
    role: 'candidate' | 'employer';
    companyName?: string;
    headline?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshAuthData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProfile, setCurrentProfile] = useState<CandidateProfile | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  // Default to null so initial page is Landing Page
  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    return localStorage.getItem('moxn_active_user_id') || null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (activeUserId) {
      headers.set('x-user-id', activeUserId);
    }
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      ...options,
      headers
    });
  };

  const refreshAuthData = async () => {
    try {
      if (!activeUserId) {
        setCurrentUser(null);
        setCurrentProfile(null);
        setCurrentCompany(null);
        // Fetch public list of available users for demo switcher
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.availableUsers) setAvailableUsers(data.availableUsers);
        }
        setLoading(false);
        return;
      }

      const res = await authFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setCurrentProfile(data.profile);
        setCurrentCompany(data.company);
        if (data.availableUsers) {
          setAvailableUsers(data.availableUsers);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeUserId) {
      localStorage.setItem('moxn_active_user_id', activeUserId);
    } else {
      localStorage.removeItem('moxn_active_user_id');
    }
    refreshAuthData();
  }, [activeUserId]);

  const switchUser = async (userId: string) => {
    setLoading(true);
    setActiveUserId(userId);
  };

  const safeParseJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (text.trim().startsWith('<') || text.includes('The page') || text.includes('DOCTYPE')) {
        throw new Error('The backend server API route was not found or returned HTML. Please ensure Vercel routes /api requests to the serverless function.');
      }
      throw new Error('Server returned an unexpected response format.');
    }
  };

  const loginWithEmail = async (email: string, password?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await safeParseJson(res);
      if (!res.ok) {
        setLoading(false);
        return { success: false, error: data.error || 'Login failed' };
      }

      setActiveUserId(data.user.id);
      setCurrentUser(data.user);
      setCurrentProfile(data.profile);
      setCurrentCompany(data.company);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const registerUser = async (data: {
    name: string;
    email: string;
    password?: string;
    role: 'candidate' | 'employer';
    companyName?: string;
    headline?: string;
  }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await safeParseJson(res);
      if (!res.ok) {
        setLoading(false);
        return { success: false, error: resData.error || 'Registration failed' };
      }

      setActiveUserId(resData.user.id);
      setCurrentUser(resData.user);
      setCurrentProfile(resData.profile);
      setCurrentCompany(resData.company);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    setActiveUserId(null);
    setCurrentUser(null);
    setCurrentProfile(null);
    setCurrentCompany(null);
    localStorage.removeItem('moxn_active_user_id');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentProfile,
        currentCompany,
        availableUsers,
        loading,
        switchUser,
        loginWithEmail,
        registerUser,
        logout,
        authFetch,
        refreshAuthData
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
