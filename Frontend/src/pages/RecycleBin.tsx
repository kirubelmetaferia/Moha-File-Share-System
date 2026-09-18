import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatFileSize, categoryIcon } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DeletedFile {
  id: string;
  originalName: string;
  fileSize: number;
  category: string;
  deletedAt: string;
  uploadedBy: { fullName: string };
  folder: { name: string } | null;
}

export default function RecycleBin() {
  const [files, setFiles] = useState<DeletedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/files/recycle-bin?limit=100");
      setFiles(res.data.data.items);
    } catch (err: any) {
      toast.error("Failed to load recycle bin");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestore = async (file: DeletedFile) => {
    try {
      await api.post(`/files/${file.id}/restore`);
      toast.success("File restored successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to restore file");
    }
  };

  const handleHardDelete = async (file: DeletedFile) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete "${file.originalName}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/files/${file.id}/hard`);
      toast.success("File permanently deleted");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to permanently delete file");
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trash2 className="size-6 text-muted-foreground" /> Recycle Bin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Files deleted from the system. They can be restored or permanently removed.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {isLoading ? (
          <div className="border border-border/50 rounded-lg divide-y divide-border/50">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center p-4 gap-4">
                <Skeleton className="h-8 w-8 rounded shrink-0" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center mt-4">
            <Trash2 className="size-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground mb-1">Recycle bin is empty</p>
            <p className="text-xs text-muted-foreground">Deleted files will appear here.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border/50 shadow-sm">
            <div className="grid grid-cols-12 gap-4 p-3 bg-muted/30 text-xs font-semibold text-muted-foreground">
              <div className="col-span-5 sm:col-span-5">Name</div>
              <div className="hidden sm:block col-span-2">Original Location</div>
              <div className="col-span-3 sm:col-span-2">Deleted On</div>
              <div className="col-span-4 sm:col-span-3 text-right">Actions</div>
            </div>
            
            {files.map(file => (
              <div key={file.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/40 transition-colors">
                <div className="col-span-5 sm:col-span-5 flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0 w-5 text-center">{categoryIcon(file.category)}</span>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-sm font-medium truncate text-foreground">{file.originalName}</span>
                    <span className="text-[10px] text-muted-foreground">{formatFileSize(file.fileSize)} • by {file.uploadedBy.fullName}</span>
                  </div>
                </div>
                <div className="hidden sm:block col-span-2 text-sm text-muted-foreground truncate">
                  {file.folder?.name || 'Root'}
                </div>
                <div className="col-span-3 sm:col-span-2 text-xs text-muted-foreground">
                  {new Date(file.deletedAt).toLocaleDateString()}
                </div>
                <div className="col-span-4 sm:col-span-3 text-right flex justify-end gap-2">
                  <Button onClick={() => handleRestore(file)} size="sm" variant="outline" className="h-8 gap-1 border-border hover:bg-brand/10 hover:text-brand px-2.5">
                    <RotateCcw className="size-3.5" /> <span className="hidden sm:inline">Restore</span>
                  </Button>
                  <Button onClick={() => handleHardDelete(file)} size="sm" variant="outline" className="h-8 gap-1 border-destructive/20 hover:bg-destructive/10 text-destructive hover:text-destructive px-2.5">
                    <AlertTriangle className="size-3.5" /> <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
