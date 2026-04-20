"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, User, Organization } from "./api";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; organizationName: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user, organization }) => {
        setUser(user);
        setOrg(organization);
      })
      .catch(() => {
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { token, user, organization } = await api.login(email, password);
    setToken(token);
    setUser(user);
    setOrg(organization);
    router.push("/dashboard");
  }

  async function register(data: { email: string; password: string; name: string; organizationName: string }) {
    const { token, user, organization } = await api.register(data);
    setToken(token);
    setUser(user);
    setOrg(organization);
    router.push("/dashboard");
  }

  function logout() {
    setToken(null);
    setUser(null);
    setOrg(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
