import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppShell from "@/components/ui/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatFileSize, categoryIcon } from "@/lib/format";
import { UploadCloud, Share2, Users as UsersIcon, Download } from "lucide-react";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import UsersList from "@/pages/UsersList";
import Files from "@/pages/Files";
import RecycleBin from "@/pages/RecycleBin";
import Plants from "@/pages/Plants";
import Departments from "@/pages/Departments";
import Shares from "@/pages/Shares";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import ForceChangePassword from "@/pages/ForceChangePassword";
import Folders from "@/pages/Folders"; // Added Folders route
import Sections from "@/pages/Sections"; // Added Sections route

interface Stats {
  totalUsers: number;
  totalFiles: number;
  totalPlants: number | null;
  totalDepartments: number | null;
  totalStorageBytes: number;
  categoryBreakdown: { category: string; count: number }[];
  recentFiles: {
    id: string;
    originalName: string;
    fileSize: number;
    createdAt: string;
    uploadedBy: { fullName: string };
  }[];
}

interface ActivityItem {
  id: string;
  action: string;
  resourceType: string | null;
  createdAt: string;
  user: { fullName: string };
}

const CHART_COLORS = ["#3B5FA6", "#4A9FE0", "#7CA6E8", "#A8C6EE", "#1a2b4a", "#6B93D6"];

function ACTION_STYLE(action: string) {
  if (action.includes("DELETE")) return "bg-destructive/10 text-destructive";
  if (action.includes("UPLOAD") || action.includes("register")) return "bg-green-500/10 text-green-600";
  return "bg-brand/10 text-brand";
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDownload(file: any) {
    try {
      const response = await api.get(`/files/${file.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.originalName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download file.");
    }
  }

  async function uploadFile(file: File) {
    setIsUploading(true);
    const type = file.type;
    let fileCategory = "OTHER";
    if (type.startsWith("image/")) fileCategory = "IMAGE";
    else if (type.startsWith("video/")) fileCategory = "VIDEO";
    else if (type === "application/pdf") fileCategory = "PDF";
    else if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv")) fileCategory = "SPREADSHEET";
    else if (type.includes("presentation") || type.includes("powerpoint")) fileCategory = "PRESENTATION";
    else if (type.includes("document") || type.includes("word") || type === "text/plain") fileCategory = "DOCUMENT";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", fileCategory);
    if (user?.plantId) formData.append("plantId", user.plantId);
    if (user?.departmentId) formData.append("departmentId", user.departmentId);
    if (user?.sectionId) formData.append("sectionId", user.sectionId);

    try {
      await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("File uploaded successfully");
      const [statsRes, activityRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/dashboard/activity"),
      ]);
      setStats(statsRes.data.data);
      setActivity(activityRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/stats"),
      api.get("/dashboard/activity"),
    ])
      .then(([statsRes, activityRes]) => {
        setStats(statsRes.data.data);
        setActivity(activityRes.data.data);
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        toast.error("Failed to load dashboard data");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const cards = stats ? [
    { label: "Users", value: stats.totalUsers },
    { label: "Files", value: stats.totalFiles },
    ...(stats.totalPlants !== null ? [{ label: "Plants", value: stats.totalPlants }] : []),
    ...(stats.totalDepartments !== null ? [{ label: "Departments", value: stats.totalDepartments }] : []),
  ] : [];

  const chartData = stats?.categoryBreakdown.filter((c) => c.count > 0) ?? [];

  const quickActions = [
    { label: isUploading ? "Uploading..." : "Upload a file", icon: UploadCloud, action: () => fileInputRef.current?.click() },
    { label: "Share a file", icon: Share2, action: () => navigate("/files") },
    ...(["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN", "DEPARTMENT_HEAD", "SECTION_HEAD"].includes(user?.role ?? "")
      ? [{ label: "Manage users", icon: UsersIcon, action: () => navigate("/users") }]
      : []),
  ];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Welcome back, {user?.fullName}
      </h1>
      <p className="text-muted-foreground text-sm mt-1 mb-6">
        Here's what's happening across your scope.
      </p>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
        {quickActions.map((action) => (
          <Button
            key={action.label}
            onClick={action.action}
            disabled={isUploading && action.icon === UploadCloud}
            className="bg-card hover:bg-brand/10 text-foreground border border-border gap-2"
          >
            <action.icon className="size-4" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5">
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {cards.map((card) => (
            <div key={card.label} className="bg-card rounded-xl border border-border p-5 transition-shadow hover:shadow-md">
              <p className="text-3xl font-bold text-brand">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Storage usage + category breakdown chart */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Storage usage</h2>
          {isLoading ? (
            <Skeleton className="h-40 w-full mt-4" />
          ) : (
            <>
              <p className="text-2xl font-bold text-brand mb-3">
                {formatFileSize(stats?.totalStorageBytes ?? 0)}
              </p>
              {chartData.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="count"
                        nameKey="category"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No files yet.</p>
              )}
              <div className="space-y-1.5 mt-2">
                {chartData.map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      {categoryIcon(c.category)} {c.category}
                    </span>
                    <span className="font-medium text-foreground">{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Activity timeline */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent activity</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${ACTION_STYLE(item.action)}`}>
                    {item.action.split(".").pop()?.replace("_", " ")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {item.user.fullName}
                      {item.resourceType && (
                        <span className="text-muted-foreground"> · {item.resourceType}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently uploaded */}
      {stats && stats.recentFiles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Recently uploaded</h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {stats.recentFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30 group"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium group-hover:text-brand transition-colors">{file.originalName}</span>
                  <span className="text-xs text-muted-foreground">
                    {file.uploadedBy.fullName} • {formatFileSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDownload(file)}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Download"
                >
                  <Download className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <AppShell>{children}</AppShell>;
}

import UserPermissions from "@/components/users/UserPermissions";
import { Toaster } from "sonner";

function App() {
  return (
    <ThemeProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/force-change-password" element={<ForceChangePassword />} />
            <Route path="/permissions-demo" element={
              <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <UserPermissions />
              </div>
            } />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/files" element={<ProtectedRoute><Files /></ProtectedRoute>} />
            <Route path="/recycle-bin" element={<ProtectedRoute><RecycleBin /></ProtectedRoute>} />
            <Route path="/shares" element={<ProtectedRoute><Shares /></ProtectedRoute>} />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN", "DEPARTMENT_HEAD", "SECTION_HEAD"]}>
                  <UsersList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                  <Plants />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN"]}>
                  <Departments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sections"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN", "DEPARTMENT_HEAD", "SECTION_HEAD"]}>
                  <Sections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/folders"
              element={
                <ProtectedRoute>
                  <Folders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;