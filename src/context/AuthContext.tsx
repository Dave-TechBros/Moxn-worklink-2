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
  applyAuthData: (data: {
    user?: User;
    profile?: CandidateProfile | null;
    company?: Company | null;
  }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'moxn_active_user_id';
const SNAPSHOT_KEY = 'moxn_auth_snapshot';
const TOKEN_KEY = 'moxn_session_token';

const readToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const writeToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
};

interface AuthSnapshot {
  user: User | null;
  profile: CandidateProfile | null;
  company: Company | null;
  availableUsers: User[];
}

const readSnapshot = (): AuthSnapshot | null => {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && ('user' in parsed)) {
      return {
        user: parsed.user || null,
        profile: parsed.profile || null,
        company: parsed.company || null,
        availableUsers: Array.isArray(parsed.availableUsers) ? parsed.availableUsers : []
      };
    }
    return null;
  } catch {
    return null;
  }
};

const writeSnapshot = (snapshot: AuthSnapshot) => {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage unavailable (private mode, quota) — non-fatal.
  }
};

const clearSnapshot = () => {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    return localStorage.getItem(SESSION_KEY) || null;
  });

  // Hydrate instantly from the last known snapshot so a returning user never
  // sees a flash of the landing page while /api/auth/me resolves.
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const snap = readSnapshot();
    return snap ? snap.user : null;
  });
  const [currentProfile, setCurrentProfile] = useState<CandidateProfile | null>(() => {
    const snap = readSnapshot();
    return snap ? snap.profile : null;
  });
  const [currentCompany, setCurrentCompany] = useState<Company | null>(() => {
    const snap = readSnapshot();
    return snap ? snap.company : null;
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>(() => {
    const snap = readSnapshot();
    return snap ? snap.availableUsers : [];
  });

  // Only gate rendering for users who have a stored session (they need to be
  // re-validated). Logged-out visitors should see the landing page instantly.
  const [loading, setLoading] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(SESSION_KEY));
  });

  const authFetch = async (url: string, options: RequestInit = {}, _retried = false): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (activeUserId) {
      headers.set('x-user-id', activeUserId);
    }
    const sessionToken = readToken();
    if (sessionToken) {
      headers.set('x-session-token', sessionToken);
    }
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    const doFetch = () =>
      fetch(url, {
        ...options,
        headers
      });

    const res = await doFetch();

    if (res.status === 401 && !_retried && !url.includes('/api/auth/')) {
      // The server could not resolve our session. This commonly happens on
      // serverless when the request lands on a different instance than the one
      // that registered the user (or the DB connection hiccupped). Re-validate
      // the session once and retry before failing the request.
      await refreshAuthData();
      return doFetch();
    }

    return res;
  };

  const refreshAuthData = async () => {
    try {
      if (!activeUserId) {
        setCurrentUser(null);
        setCurrentProfile(null);
        setCurrentCompany(null);
        clearSnapshot();
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
        if (data.user) {
          writeSnapshot({
            user: data.user,
            profile: data.profile || null,
            company: data.company || null,
            availableUsers: data.availableUsers || availableUsers
          });
        } else {
          // The server explicitly confirmed this user id no longer resolves
          // to an account. Only then is the session truly gone.
          localStorage.removeItem(SESSION_KEY);
          setActiveUserId(null);
          setCurrentUser(null);
          setCurrentProfile(null);
          setCurrentCompany(null);
          clearSnapshot();
        }
      } else {
        // Non-OK (5xx, gateway 413, HTML error page, etc.). This is a
        // transient server problem, NOT a missing account — keep the cached
        // session so the user is not logged out by an infrastructure hiccup.
        console.warn(`[Auth] refresh returned ${res.status}; keeping cached session.`);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Failed to fetch user session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeUserId) {
      localStorage.setItem(SESSION_KEY, activeUserId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    refreshAuthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  const switchUser = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await safeParseJson(res);
      if (res.ok && data.user) {
        setActiveUserId(data.user.id);
        writeToken(data.token || null);
        return;
      }
      // Fallback: switch locally even if the endpoint hiccupped; the /me
      // refresh below re-validates and may clear the stale token.
      setActiveUserId(userId);
      writeToken(null);
    } catch {
      setActiveUserId(userId);
      writeToken(null);
    }
  };

  const safeParseJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      const trimmed = text.trim();
      if (trimmed.startsWith('<') || trimmed.includes('DOCTYPE') || trimmed.includes('The page')) {
        throw new Error('API endpoint returned HTML instead of JSON. Check backend routing.');
      }
      if (trimmed.length > 0 && trimmed.length < 300) {
        throw new Error(trimmed);
      }
      throw new Error('Server returned an unexpected response.');
    }
  };

  const persistAuth = (user: User, profile: CandidateProfile | null, company: Company | null, users: User[]) => {
    setCurrentUser(user);
    setCurrentProfile(profile);
    setCurrentCompany(company);
    // Merge: login/register responses do not echo availableUsers, so keep the
    // existing list rather than wiping the demo user switcher.
    const mergedUsers = users.length ? users : availableUsers;
    if (mergedUsers.length) setAvailableUsers(mergedUsers);
    writeSnapshot({ user, profile, company, availableUsers: mergedUsers });
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
      writeToken(data.token || null);
      persistAuth(data.user, data.profile || null, data.company || null, data.availableUsers || []);
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
      writeToken(resData.token || null);
      persistAuth(resData.user, resData.profile || null, resData.company || null, resData.availableUsers || []);
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
    localStorage.removeItem(SESSION_KEY);
    clearSnapshot();
  };

  const applyAuthData = (data: {
    user?: User;
    profile?: CandidateProfile | null;
    company?: Company | null;
  }) => {
    if (data.user) setCurrentUser(data.user);
    if (data.profile !== undefined) setCurrentProfile(data.profile);
    if (data.company !== undefined) setCurrentCompany(data.company);
    const next = {
      user: data.user || currentUser,
      profile: data.profile !== undefined ? data.profile : currentProfile,
      company: data.company !== undefined ? data.company : currentCompany,
      availableUsers
    };
    writeSnapshot(next);
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
        refreshAuthData,
        applyAuthData
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
