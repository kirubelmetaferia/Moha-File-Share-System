import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import logo from "@/assets/logo.png";
import loginBg from "@/assets/bg-login.jpg";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [emailOrId, setEmailOrId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await api.post("/auth/forgot-password", { emailOrId });
      setStatus("success");
      setMessage(response.data.message || "Password reset email sent");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Failed to process request");
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

      <div className="lg:col-span-3 flex flex-col items-center justify-center p-8 relative">
        <button 
          onClick={() => navigate('/login')}
          className="absolute top-8 left-8 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to login
        </button>

        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex justify-center mb-4">
            <img src={logo} alt="MOHA" className="h-12" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Reset Password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your email or employee ID and we'll send you a link to reset your password.
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
                Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="emailOrId" className="text-sm font-medium text-foreground">
                  Email or Employee ID
                </label>
                <Input
                  id="emailOrId"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  placeholder="e.g. john@moha.local or EMP001"
                  required
                  autoFocus
                  className="bg-muted/30"
                />
              </div>

              {status === "error" && (
                <p className="text-sm font-medium text-destructive animate-in fade-in duration-200" role="alert">
                  {message}
                </p>
              )}

              <Button
                type="submit"
                isLoading={status === "loading"}
                className="w-full h-11 bg-brand hover:bg-brand/90 text-white font-medium rounded-lg text-base"
              >
                Send Reset Link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
