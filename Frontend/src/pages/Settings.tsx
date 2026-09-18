import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Loader2, Settings as SettingsIcon, Info, KeyRound, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings(data.data);
    } catch (error: any) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    setSavingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      await api.put(`/settings/${key}`, { value });
      toast.success("Setting updated successfully");
      fetchSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update setting");
    } finally {
      setSavingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  function formatKey(key: string) {
    return key
      .split(/[_.]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getSettingDescription(key: string) {
    const descriptions: Record<string, string> = {
      'system.maintenance_mode': 'Restricts access to the system for maintenance',
      'storage.max_file_size_mb': 'Maximum allowed file size for uploads in Megabytes',
      'storage.allowed_extensions': 'Comma-separated list of allowed file extensions',
      'auth.session_timeout_minutes': 'Idle time before a user is automatically logged out',
      'ui.default_theme': 'Default visual theme for new users (light, dark, system)',
    };
    return descriptions[key] || 'System configuration value';
  }

  function renderInput(s: any) {
    const isBoolean = typeof s.value === 'boolean';
    const isNumber = typeof s.value === 'number';

    if (isBoolean) {
      return (
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={s.value}
            onChange={(e) => updateSetting(s.key, e.target.checked)}
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      );
    }

    if (isNumber) {
      return (
        <Input
          type="number"
          defaultValue={s.value}
          className="w-full sm:max-w-[200px] bg-background"
          onBlur={(e) => {
            const numVal = Number(e.target.value);
            if (numVal !== s.value && !isNaN(numVal)) updateSetting(s.key, numVal);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const numVal = Number(e.currentTarget.value);
              if (numVal !== s.value && !isNaN(numVal)) {
                updateSetting(s.key, numVal);
                e.currentTarget.blur();
              }
            }
          }}
        />
      );
    }

    return (
      <Input
        defaultValue={s.value}
        className="flex-1 bg-background"
        onBlur={(e) => {
          if (e.target.value !== s.value) updateSetting(s.key, e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.currentTarget.value !== s.value) {
            updateSetting(s.key, e.currentTarget.value);
            e.currentTarget.blur();
          }
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  const rules = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
    match: newPassword === confirmPassword && newPassword.length > 0,
  };

  const isFormValid = Object.values(rules).every(Boolean) && currentPassword.length > 0;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;
    
    setIsChangingPassword(true);
    try {
      await api.post("/auth/change-password", { 
        currentPassword, 
        newPassword 
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Change Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Update your account password</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm p-6 max-w-2xl">
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Current Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
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

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">New Password</label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
              <h4 className="font-medium text-foreground">Password must contain:</h4>
              <ul className="grid sm:grid-cols-2 gap-1.5">
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

            <Button
              type="submit"
              disabled={!isFormValid}
              isLoading={isChangingPassword}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl">
            <SettingsIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">System Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage application configurations and preferences</p>
          </div>
        </div>
      
      <div className="space-y-4">
        {settings.length === 0 ? (
          <div className="border-2 border-dashed border-border/60 rounded-3xl p-16 text-center bg-card/30 flex flex-col items-center justify-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Info className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Settings Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">There are currently no custom settings configured for this system.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
            <div className="grid divide-y divide-border/60">
              {settings.map((s) => (
                <div key={s.key} className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 hover:bg-accent/5 transition-colors">
                  <div className="flex-1">
                    <label className="text-base font-semibold text-foreground block mb-1">
                      {formatKey(s.key)}
                    </label>
                    <p className="text-sm text-muted-foreground mb-2">
                      {getSettingDescription(s.key)}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono bg-muted/60 inline-block px-2 py-0.5 rounded-md border border-border/50">
                      {s.key}
                    </p>
                  </div>
                  <div className="md:flex-1 flex items-center gap-3 justify-end md:justify-start">
                    {renderInput(s)}
                    <div className="w-6 flex justify-center flex-shrink-0">
                      {savingKeys[s.key] ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <div className="w-4 h-4" /> 
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
