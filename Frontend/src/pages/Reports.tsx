import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { api } from "@/lib/api";
import { formatFileSize, categoryIcon } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { Database, FileDigit, Users as UsersIcon, Clock, HardDrive, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StorageStats {
  totalBytes: number;
  categoryBreakdown: Record<string, number>;
  largestFiles: {
    id: string;
    originalName: string;
    fileSize: number;
    category: string;
  }[];
}

interface ActiveFile {
  id: string;
  originalName: string;
  _count: { accessLogs: number };
  uploadedBy: { fullName: string };
  category: string;
}

interface StaleFile {
  id: string;
  originalName: string;
  createdAt: string;
  uploadedBy: { fullName: string };
  category: string;
}

interface ActiveUser {
  id: string;
  fullName: string;
  email: string;
  lastLogin: string;
  _count: { uploadedFiles: number; fileAccessLogs: number };
}

const CHART_COLORS = ["#3B5FA6", "#4A9FE0", "#7CA6E8", "#A8C6EE", "#1a2b4a", "#6B93D6", "#9E9E9E"];

export default function Reports() {
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [activeFiles, setActiveFiles] = useState<ActiveFile[]>([]);
  const [staleFiles, setStaleFiles] = useState<StaleFile[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [staleMonths, setStaleMonths] = useState(6);
  const [activeUserDays, setActiveUserDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [storageRes, activeFilesRes, staleRes, usersRes] = await Promise.all([
          api.get("/reports/storage"),
          api.get("/reports/active-files"),
          api.get(`/reports/stale-files?months=${staleMonths}`),
          api.get(`/reports/active-users?period=${activeUserDays}`),
        ]);
        
        setStorage(storageRes.data.data);
        setActiveFiles(activeFilesRes.data.data);
        setStaleFiles(staleRes.data.data);
        setActiveUsers(usersRes.data.data);
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReports();
  }, [staleMonths, activeUserDays]);

  if (loading && !storage) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const pieData = storage ? Object.entries(storage.categoryBreakdown).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Database className="size-6 text-brand" />
          System Reports & Analytics
        </h1>
        <Button 
          onClick={() => window.print()} 
          className="print:hidden flex items-center gap-2"
          variant="outline"
        >
          <Printer className="size-4" />
          Export as PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Storage Summary */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand/40">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HardDrive className="size-5 text-muted-foreground" />
            Storage Overview
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full flex flex-col items-center justify-center">
              <p className="text-sm text-muted-foreground mb-1">Total Used Storage</p>
              <p className="text-4xl font-bold text-brand">
                {storage ? formatFileSize(storage.totalBytes) : '0 B'}
              </p>
            </div>
            <div className="h-48 w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => formatFileSize(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Largest Files */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand/40">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileDigit className="size-5 text-muted-foreground" />
            Top 10 Largest Files
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-2">
            {storage?.largestFiles.map((file, i) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-muted-foreground font-mono text-sm w-4">{i + 1}.</span>
                  <div className="truncate">
                    <p className="text-sm font-medium text-foreground truncate">{file.originalName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {categoryIcon(file.category)} {file.category}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap ml-4 text-brand">
                  {formatFileSize(file.fileSize)}
                </span>
              </div>
            ))}
            {storage?.largestFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No files found.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Active Files */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand/40 flex flex-col h-[400px]">
          <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="size-5 text-green-500" />
              Most Accessed Files (30 days)
            </span>
          </h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {activeFiles.map(file => (
              <div key={file.id} className="flex justify-between items-center p-3 hover:bg-muted/30 rounded-lg transition-colors border border-transparent hover:border-border">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-sm font-medium truncate">{file.originalName}</p>
                  <p className="text-xs text-muted-foreground">{file.uploadedBy.fullName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 bg-brand/10 text-brand px-3 py-1 rounded-full text-xs font-semibold">
                  {file._count.accessLogs} views
                </div>
              </div>
            ))}
            {activeFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No recent file access recorded.</p>
            )}
          </div>
        </div>

        {/* Stale Files */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand/40 flex flex-col h-[400px]">
          <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="size-5 text-orange-500" />
              Stale Files
            </span>
            <div className="flex gap-1 bg-muted p-1 rounded-md">
              {[3, 6, 12].map(m => (
                <button 
                  key={m}
                  onClick={() => setStaleMonths(m)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${staleMonths === m ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {staleFiles.map(file => (
              <div key={file.id} className="flex justify-between items-center p-3 hover:bg-muted/30 rounded-lg transition-colors border border-transparent hover:border-border">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-sm font-medium truncate">{file.originalName}</p>
                  <p className="text-xs text-muted-foreground">Uploaded: {new Date(file.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {staleFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No stale files found for this period.</p>
            )}
          </div>
        </div>
      </div>

      {/* Active Users */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand/40">
        <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <UsersIcon className="size-5 text-blue-500" />
            User Activity
          </span>
          <div className="flex gap-1 bg-muted p-1 rounded-md">
            {[7, 30, 90].map(d => (
              <button 
                key={d}
                onClick={() => setActiveUserDays(d)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${activeUserDays === d ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg rounded-bl-lg">User</th>
                <th className="px-4 py-3 text-center">Files Uploaded</th>
                <th className="px-4 py-3 text-center">Files Accessed</th>
                <th className="px-4 py-3 rounded-tr-lg rounded-br-lg text-right">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map(user => (
                <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors duration-200">
                  <td className="px-4 py-4">
                    <p className="font-medium text-foreground">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-6 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-medium">
                      {user._count.uploadedFiles}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-6 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                      {user._count.fileAccessLogs}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-muted-foreground text-xs whitespace-nowrap">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
              {activeUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No active users in the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
