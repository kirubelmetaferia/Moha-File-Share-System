import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Share2, FileText, Folder, User, Users, Factory, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Share {
  id: string;
  permission: string;
  file?: { originalName: string } | null;
  folder?: { name: string } | null;
  sharedWithUser?: { fullName: string };
  sharedWithDept?: { name: string };
  sharedWithPlant?: { name: string };
  sharedBy: string;
}

export default function Shares() {
  const { user } = useAuth();
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shared' | 'received'>('shared');

  const filteredShares = shares.filter(s => {
    if (activeTab === 'shared') {
      return s.sharedBy === user?.id;
    }
    return s.sharedBy !== user?.id;
  });

  async function load() {
    setIsLoading(true);
    const { data } = await api.get("/shares");
    setShares(data.data.items);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRevoke(id: string) {
    await api.delete(`/shares/${id}`);
    load();
  }

  function getTargetInfo(s: Share) {
    if (s.sharedWithUser) return { name: s.sharedWithUser.fullName, icon: <User className="w-4 h-4 text-blue-500" /> };
    if (s.sharedWithDept) return { name: s.sharedWithDept.name, icon: <Users className="w-4 h-4 text-emerald-500" /> };
    if (s.sharedWithPlant) return { name: s.sharedWithPlant.name, icon: <Factory className="w-4 h-4 text-orange-500" /> };
    return { name: "Unknown", icon: <User className="w-4 h-4 text-muted-foreground" /> };
  }

  function getPermissionBadgeClass(permission: string) {
    if (permission.toLowerCase().includes("edit") || permission.toLowerCase().includes("write")) {
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    }
    return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Share2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Active Shares</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading shares…" : `Manage your shared and received files`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 border-b border-border/60">
        <button
          onClick={() => setActiveTab('shared')}
          className={`px-4 py-2.5 font-medium text-sm transition-colors relative ${activeTab === 'shared' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Shared by Me
          {activeTab === 'shared' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2.5 font-medium text-sm transition-colors relative ${activeTab === 'received' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Received
          {activeTab === 'received' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
        </button>
      </div>

      {isLoading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border/50 bg-card rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div>
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredShares.length === 0 && (
        <div className="border-2 border-dashed border-border/60 rounded-3xl p-16 flex flex-col items-center justify-center text-center bg-card/30">
          <div className="p-5 bg-primary/5 rounded-full mb-5">
            <Share2 className="w-10 h-10 text-primary/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {activeTab === 'shared' ? "No active shares" : "No received files"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {activeTab === 'shared' 
              ? "You haven't shared any files or folders yet." 
              : "No one has shared any files or folders with you yet."}
          </p>
        </div>
      )}

      {!isLoading && filteredShares.length > 0 && (
        <div className="grid gap-4">
          {filteredShares.map((share) => {
            const isFile = !!share.file;
            const target = getTargetInfo(share);
            
            return (
              <div 
                key={share.id} 
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-border/50 bg-card hover:bg-accent/5 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="flex items-start sm:items-center gap-5 mb-4 sm:mb-0">
                  <div className={`p-3.5 rounded-xl flex-shrink-0 ${isFile ? 'bg-indigo-500/10 text-indigo-500' : 'bg-sky-500/10 text-sky-500'}`}>
                    {isFile ? <FileText className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base mb-1.5 line-clamp-1">
                      {share.file ? share.file.originalName : share.folder?.name}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 py-0.5 shadow-sm">
                        {target.icon}
                        <span className="font-medium text-foreground">{target.name}</span>
                      </span>
                      <span className="text-border">•</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold uppercase tracking-wider ${getPermissionBadgeClass(share.permission)}`}>
                        {share.permission.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_ADMIN' || share.sharedBy === user?.id) && (
                  <Button
                    onClick={() => handleRevoke(share.id)}
                    variant="outline"
                    className="w-full sm:w-auto border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 group-hover:border-destructive/40 bg-destructive/5"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke Access
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}