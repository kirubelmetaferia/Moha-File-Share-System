import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatFileSize } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { History, X, Download, RotateCcw, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

interface FileVersion {
  id: string;
  versionNumber: number;
  fileSize: number;
  originalName: string;
  createdAt: string;
  uploadedBy: { fullName: string; employeeId: string };
}

interface Props {
  fileId: string;
  fileName: string;
  onClose: () => void;
  onRestored: () => void;
}

export default function FileVersionModal({ fileId, fileName, onClose, onRestored }: Props) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVersions = () => {
    setIsLoading(true);
    api.get(`/files/${fileId}/versions`)
      .then((res) => {
        setVersions(res.data.data);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || "Failed to load versions");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchVersions();
  }, [fileId]);

  const handleRestore = async (versionId: string) => {
    if (!confirm("Are you sure you want to restore this version? The current file state will be backed up.")) return;
    try {
      await api.post(`/files/${fileId}/versions/${versionId}/restore`);
      toast.success("Version restored successfully");
      onRestored();
      fetchVersions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to restore version");
    }
  };

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(`/files/${fileId}/versions`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("New version uploaded successfully");
      onRestored();
      fetchVersions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to upload new version");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
              <History className="size-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Version History</h2>
              <p className="text-xs text-muted-foreground">{fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleUploadNewVersion} 
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploading} 
              size="sm"
              className="bg-brand hover:bg-brand/90 text-white gap-2"
            >
              <UploadCloud className="size-4" />
              {isUploading ? "Uploading..." : "New Version"}
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
              <X className="size-5" />
            </button>
          </div>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 bg-muted/10">
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">No previous versions found.</div>
          ) : (
            <div className="space-y-3">
              {versions.map((v, i) => (
                <div key={v.id} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between gap-4 transition-all hover:border-brand/40 hover:shadow-sm">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-brand/10 text-brand px-2 py-0.5 rounded text-xs font-bold">
                        v{v.versionNumber}
                      </span>
                      {i === 0 && <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded text-xs font-semibold">Current</span>}
                    </div>
                    <p className="text-sm font-medium truncate">{v.originalName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(v.fileSize)} • {new Date(v.createdAt).toLocaleString()} • {v.uploadedBy.fullName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {i !== 0 && (
                      <Button onClick={() => handleRestore(v.id)} variant="outline" size="sm" className="h-8 gap-1.5 border-border hover:bg-brand/10 hover:text-brand">
                        <RotateCcw className="size-3.5" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
