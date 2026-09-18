import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ShieldAlert, X } from "lucide-react";
import { type User } from "./UserModal";

interface AdminResetPasswordModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminResetPasswordModal({ user, onClose, onSuccess }: AdminResetPasswordModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleReset() {
    setStatus("loading");
    setMessage("");

    try {
      const response = await api.post(`/users/${user.id}/reset-password`);
      setStatus("success");
      setMessage(response.data.message || "Password reset successfully");
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Failed to reset password");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">Reset User Password</h2>
          <button 
            onClick={onClose}
            disabled={status === "loading"}
            className="text-muted-foreground hover:bg-muted p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {status === "success" ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-2">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-foreground">Password Reset</h3>
              <p className="text-sm text-muted-foreground">
                {message}
              </p>
              <Button onClick={onSuccess} className="mt-4">Done</Button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">You are about to reset this user's password:</p>
                  <ul className="list-disc list-inside text-amber-700 ml-1">
                    <li>{user.fullName} ({user.employeeId})</li>
                    <li>{user.email}</li>
                  </ul>
                  <p className="mt-2">
                    This will send a secure setup link to their email address and require them to set a new password on their next login. Their current password will be immediately invalidated.
                  </p>
                </div>
              </div>

              {status === "error" && (
                <p className="text-sm font-medium text-destructive" role="alert">
                  {message}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose} disabled={status === "loading"}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleReset} 
                  isLoading={status === "loading"}
                  className="bg-brand hover:bg-brand/90 text-white"
                >
                  Confirm Reset
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Just a quick local Check icon component since lucide Check wasn't imported at top
function Check(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
