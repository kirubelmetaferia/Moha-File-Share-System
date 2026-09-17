import { useState } from "react";
import { X, Cloud, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

interface Props {
  folderId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CloudImportModal({ folderId, onClose, onSuccess }: Props) {
  const [fileId, setFileId] = useState("");
  const [fileName, setFileName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileId || !fileName || !accessToken) return;

    setIsImporting(true);
    try {
      await api.post("/cloud/google", {
        fileId,
        fileName,
        accessToken,
        folderId,
        mimeType: "application/octet-stream"
      });
      toast.success("File imported successfully from Google Drive");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to import file");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Cloud className="size-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Import from Cloud</h2>
              <p className="text-xs text-muted-foreground">Google Drive Integration</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>
        
        <form onSubmit={handleImport} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">File Name</label>
            <Input
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              placeholder="e.g. document.pdf"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Google Drive File ID</label>
            <Input
              value={fileId}
              onChange={e => setFileId(e.target.value)}
              placeholder="1A2B3C..."
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Access Token</label>
            <Input
              type="password"
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              placeholder="ya29.a0Ael..."
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              For testing, provide a valid Google OAuth access token with Drive read scope.
            </p>
          </div>
          
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isImporting}>
              {isImporting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Cloud className="size-4 mr-2" />}
              Import File
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
