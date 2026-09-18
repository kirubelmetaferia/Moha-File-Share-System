import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  employeeId: string;
  fullName: string;
  role: string;
  plantId: string | null;
  departmentId: string | null;
  sectionId: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (employeeId: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("moha_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  async function login(employeeId: string, password: string) {
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", { employeeId, password });
      localStorage.setItem("moha_token", data.data.token);
      localStorage.setItem("moha_user", JSON.stringify(data.data.user));
      setUser(data.data.user);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("moha_token");
    localStorage.removeItem("moha_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}