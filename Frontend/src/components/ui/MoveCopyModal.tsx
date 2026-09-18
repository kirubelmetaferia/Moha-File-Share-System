import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Folder, X, MoveRight, CopyPlus } from "lucide-react";
import { toast } from "sonner";

interface FolderItem {
  id: string;
  name: string;
}

interface Props {
  fileId: string;
  fileName: string;
  action: "move" | "copy";
  onClose: () => void;
  onSuccess: () => void;
}

export default function MoveCopyModal({ fileId, fileName, action, onClose, onSuccess }: Props) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Root" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadFolders(null);
  }, []);

  const loadFolders = async (parentId: string | null) => {
    setIsLoading(true);
    try {
      const folderParam = parentId ? `&parentFolderId=${parentId}` : "&parentFolderId=null";
      const res = await api.get(`/folders?limit=100${folderParam}`);
      setFolders(res.data.data);
    } catch (err: any) {
      toast.error("Failed to load folders");
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (id: string | null, name: string) => {
    setCurrentFolderId(id);
    if (id === null) {
      setBreadcrumbs([{ id: null, name: "Root" }]);
    } else {
      const existingIndex = breadcrumbs.findIndex(b => b.id === id);
      if (existingIndex !== -1) {
        setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, { id, name }]);
      }
    }
    loadFolders(id);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      if (action === "move") {
        await api.post(`/files/${fileId}/move`, { newFolderId: currentFolderId });
        toast.success("File moved successfully");
      } else {
        await api.post(`/files/${fileId}/copy`, { newFolderId: currentFolderId });
        toast.success("File copied successfully");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to ${action} file`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${action === 'move' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
              {action === 'move' ? <MoveRight className="size-5" /> : <CopyPlus className="size-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground capitalize">{action} File</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>
        
        <div className="p-4 bg-muted/30 border-b border-border text-sm flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id || 'root'} className="flex items-center">
              <button 
                onClick={() => navigateToFolder(crumb.id, crumb.name)}
                className={`hover:text-brand ${i === breadcrumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
              >
                {crumb.name}
              </button>
              {i < breadcrumbs.length - 1 && <span className="mx-2 text-muted-foreground/50">/</span>}
            </span>
          ))}
        </div>

        <div className="p-2 overflow-y-auto flex-1 min-h-[200px]">
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground text-sm">Loading...</div>
          ) : folders.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">Empty folder.</div>
          ) : (
            <div className="space-y-1">
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => navigateToFolder(f.id, f.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <Folder className="size-5 text-blue-500/70 fill-current" />
                  <span className="text-sm font-medium">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/10">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className={action === 'move' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}>
            {isSaving ? "Saving..." : `${action === 'move' ? 'Move' : 'Copy'} Here`}
          </Button>
        </div>
      </div>
    </div>
  );
}
