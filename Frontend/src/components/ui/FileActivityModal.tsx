import { useEffect, useState } from "react";
import { X, Loader2, Eye, Download, User as UserIcon, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface User {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  profileImage: string | null;
}

interface ActivityLog {
  id: string;
  action: "VIEW" | "DOWNLOAD" | "EDIT" | "DELETE" | "SHARE";
  accessedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  user: User;
}

interface FileActivityModalProps {
  file: any;
  onClose: () => void;
}

export default function FileActivityModal({ file, onClose }: FileActivityModalProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get(`/files/${file.id}/activity`);
        setLogs(response.data.data);
      } catch (err: any) {
        console.error("Failed to load activity logs", err);
        setError(err.response?.data?.message || err.response?.data?.error || "Failed to load activity logs.");
      } finally {
        setIsLoading(false);
      }
    }
    loadActivity();
  }, [file.id]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "VIEW": return <Eye className="size-4 text-blue-500" />;
      case "DOWNLOAD": return <Download className="size-4 text-emerald-500" />;
      default: return <AlertCircle className="size-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "VIEW": return "Viewed file";
      case "DOWNLOAD": return "Downloaded file";
      default: return action;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg shrink-0">
              <Eye className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">File Activity Log</h2>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {file.originalName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <Loader2 className="size-8 animate-spin text-brand" />
              <p className="text-sm text-muted-foreground">Loading activity logs...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3 text-destructive">
              <AlertCircle className="size-10 opacity-50" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                <Eye className="size-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground">This file hasn't been viewed or downloaded yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative before:absolute before:inset-y-0 before:left-6 before:w-px before:bg-border space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="relative flex items-start gap-4">
                    <div className="absolute left-6 -translate-x-1/2 p-1 bg-card rounded-full border border-border shadow-sm z-10">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="ml-12 flex-1 bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2.5">
                          {log.user.profileImage ? (
                            <img src={log.user.profileImage} alt={log.user.fullName} className="size-6 rounded-full object-cover" />
                          ) : (
                            <div className="size-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold">
                              {log.user.fullName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-none">{log.user.fullName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{log.user.employeeId}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground tabular-nums bg-muted px-2 py-0.5 rounded-md">
                          {formatDate(log.accessedAt)}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm text-foreground flex items-center gap-2">
                        <span className="font-medium text-foreground/80">{getActionLabel(log.action)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
