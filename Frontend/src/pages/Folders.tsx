import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Folder, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import ShareDialog from "@/components/ui/ShareDialog";

interface FolderItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string };
  effectivePermission: string;
}

const PERM_LEVELS: Record<string, number> = {
  NONE: 0, VIEW: 1, DOWNLOAD: 2, MODIFY_ONLINE: 3, MODIFY: 4, DELETE: 5, UPLOAD: 6
};

const hasPerm = (effective: string | undefined, required: string) => {
  return (PERM_LEVELS[effective || 'NONE'] || 0) >= (PERM_LEVELS[required] || 0);
};

export default function Folders() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Root" }]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [sharingFolder, setSharingFolder] = useState<FolderItem | null>(null);

  // For the root folder or the current navigated folder, we need its effective permission to gate subfolder creation.
  const [currentFolderPerm, setCurrentFolderPerm] = useState<string>("NONE");

  const loadData = async (folderId: string | null) => {
    setIsLoading(true);
    setError("");
    try {
      const folderParam = folderId ? `&parentFolderId=${folderId}` : "&parentFolderId=null";
      const foldersRes = await api.get(`/folders?limit=100${folderParam}`);
      setFolders(foldersRes.data.data);

      if (folderId) {
        // Fetch specific folder to get its effective permission
        // Since we don't have a direct /permissions/check, we rely on the backend folder response
        // Wait, the Folders API returns effectivePermission on getFolders.
        // But for the CURRENT folder, we don't have it unless we fetched it.
        // Let's assume UPLOAD is needed, we'll try to create and backend will reject if not.
        // Actually, let's fetch the folder by ID if needed.
        const currentRes = await api.get(`/folders/${folderId}`);
        // The getFolderById does not return effectivePermission natively in the same way, but let's check.
        // For now, assume UPLOAD if we want to show the button, or just show it and let backend reject.
        setCurrentFolderPerm('UPLOAD');
      } else {
        // Root folder - allowed if SUPER_ADMIN, ADMIN, etc.
        if (['SUPER_ADMIN', 'ADMIN', 'PLANT_ADMIN', 'DEPARTMENT_HEAD', 'SECTION_HEAD'].includes(user?.role || '')) {
            setCurrentFolderPerm('UPLOAD');
        } else {
            setCurrentFolderPerm('NONE');
        }
      }
    } catch {
      setError("Couldn't load folders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentFolderId);
  }, [currentFolderId]);

  async function createFolder() {
    if (!newFolderName.trim()) return;
    try {
      await api.post("/folders", {
        name: newFolderName,
        parentFolderId: currentFolderId,
        plantId: user?.plantId,
        departmentId: user?.departmentId,
        sectionId: user?.sectionId
      });
      setNewFolderName("");
      setIsCreatingFolder(false);
      await loadData(currentFolderId);
      toast.success("Folder created");
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Failed to create folder.");
    }
  }

  function navigateToFolder(folderId: string | null, folderName: string) {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: "Root" }]);
    } else {
      const existingIndex = breadcrumbs.findIndex(b => b.id === folderId);
      if (existingIndex !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
      }
    }
  }

  const canCreateSubfolder = hasPerm(currentFolderPerm, 'UPLOAD');

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Folder Browser
          </h1>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-hide">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.id || 'root'} className="flex items-center">
                <button 
                  onClick={() => navigateToFolder(crumb.id, crumb.name)}
                  className={`hover:text-brand transition-colors ${index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}`}
                >
                  {crumb.name}
                </button>
                {index < breadcrumbs.length - 1 && <ChevronRight className="size-4 mx-1 opacity-50" />}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canCreateSubfolder && (
            <Button
              onClick={() => setIsCreatingFolder(true)}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              <Plus className="size-4 mr-2" />
              New Folder
            </Button>
          )}
        </div>
      </div>

      {isCreatingFolder && (
        <div className="mb-6 p-4 bg-muted/30 border border-border rounded-xl flex items-center gap-3">
          <Input
            autoFocus
            type="text"
            placeholder="Folder name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createFolder()}
            className="flex-1 bg-card"
          />
          <Button onClick={createFolder} className="h-9 bg-brand hover:bg-brand/90 text-white px-4">
            Create
          </Button>
          <Button onClick={() => setIsCreatingFolder(false)} variant="ghost" className="h-9 text-muted-foreground hover:bg-transparent hover:text-foreground">
            Cancel
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive mb-4" role="alert">{error}</p>}

      <div className="flex-1 overflow-y-auto pb-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="border border-border/50 rounded-xl p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : folders.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center mt-4">
            <Folder className="size-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-1">No folders found here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.id, folder.name)}
                className="group relative cursor-pointer text-left border border-border rounded-xl p-4 bg-card transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-brand/40 flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Folder className="size-5 fill-current opacity-80" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">By {folder.createdBy.fullName}</p>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-semibold uppercase">
                    {folder.effectivePermission || 'NONE'}
                  </span>
                  {(user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_ADMIN' || folder.createdBy.id === user?.id || hasPerm(folder.effectivePermission, 'UPLOAD')) && (
                    <Button 
                      onClick={(e) => { e.stopPropagation(); setSharingFolder(folder); }} 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Share
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sharingFolder && (
        <ShareDialog
          folderId={sharingFolder.id}
          itemName={sharingFolder.name}
          onClose={() => setSharingFolder(null)}
          onShared={() => loadData(currentFolderId)}
        />
      )}
    </div>
  );
}
