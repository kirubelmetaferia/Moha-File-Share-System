import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import loginBg from "@/assets/bg-login.jpg";

export default function Login() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear error if user starts typing again to fix their mistake
  useEffect(() => {
    if (error) setError("");
  }, [employeeId, password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(employeeId, password);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.response?.data?.requiresPasswordChange) {
        localStorage.setItem("tempToken", err.response.data.tempToken);
        navigate("/force-change-password");
        return;
      }
      setError(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-5 bg-background">
      <div className="hidden lg:block lg:col-span-2 relative overflow-hidden">
        <img
          src={loginBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-brand/40" />
        <div className="relative z-10 h-full p-12 flex items-start">
          <img src={logo} alt="MOHA" className="h-10 brightness-0 invert" />
        </div>
      </div>

      <div className="lg:col-span-3 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex justify-center mb-4">
            <img src={logo} alt="MOHA" className="h-12" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Enter your employee ID to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="employeeId" className="text-sm font-medium text-foreground">
                Employee ID
              </label>
              <Input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP001"
                autoFocus
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <button 
                  type="button" 
                  onClick={() => navigate('/forgot-password')} 
                  className="text-sm font-medium text-[var(--brand)] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-muted/30 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive animate-in fade-in duration-200" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full h-11 bg-brand hover:bg-brand/90 text-white font-medium rounded-lg text-base"
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}