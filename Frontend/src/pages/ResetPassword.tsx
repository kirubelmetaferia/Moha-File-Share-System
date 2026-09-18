import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import logo from "@/assets/logo.png";
import loginBg from "@/assets/bg-login.jpg";
import { Eye, EyeOff, Check, X } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const rules = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
    match: newPassword === confirmPassword && newPassword.length > 0,
  };

  const isFormValid = Object.values(rules).every(Boolean);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No reset token provided. Please use the link from your email.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || !token) return;
    
    setStatus("loading");
    setMessage("");

    try {
      const response = await api.post("/auth/reset-password", { 
        token, 
        newPassword 
      });
      setStatus("success");
      setMessage(response.data.message || "Password updated successfully");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Failed to reset password");
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

      <div className="lg:col-span-3 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex justify-center mb-4">
            <img src={logo} alt="MOHA" className="h-12" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Set New Password</h2>
            <p className="text-sm text-muted-foreground">
              Please enter your new password below.
            </p>
          </div>

          {status === "success" ? (
            <div className="p-4 bg-green-50/50 border border-green-200 rounded-lg space-y-4">
              <p className="text-sm text-green-800 font-medium">
                {message}
              </p>
              <Button 
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-base"
              >
                Log In Now
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-muted/30 pr-10"
                      disabled={!token}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={!token}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-muted/30"
                    disabled={!token}
                  />
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
                <h4 className="font-medium text-foreground">Password must contain:</h4>
                <ul className="space-y-1.5">
                  <li className={`flex items-center gap-2 ${rules.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {rules.length ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-50" />}
                    At least 8 characters
                  </li>
                  <li className={`flex items-center gap-2 ${rules.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {rules.uppercase ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-50" />}
                    Uppercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${rules.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {rules.lowercase ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-50" />}
                    Lowercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${rules.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {rules.number ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-50" />}
                    Number
                  </li>
                  <li className={`flex items-center gap-2 ${rules.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {rules.special ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-50" />}
                    Special character
                  </li>
                  <li className={`flex items-center gap-2 ${rules.match ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {rules.match ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 opacity-50" />}
                    Passwords match
                  </li>
                </ul>
              </div>

              {status === "error" && (
                <p className="text-sm font-medium text-destructive animate-in fade-in duration-200" role="alert">
                  {message}
                </p>
              )}

              <Button
                type="submit"
                disabled={!isFormValid || !token}
                isLoading={status === "loading"}
                className="w-full h-11 bg-brand hover:bg-brand/90 text-white font-medium rounded-lg text-base"
              >
                Reset Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
