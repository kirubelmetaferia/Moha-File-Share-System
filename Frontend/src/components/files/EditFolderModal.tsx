import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { X, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  folderId: string;
  currentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditFolderModal({ folderId, currentName, onClose, onSuccess }: Props) {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await api.put(`/folders/${folderId}`, { name });
      toast.success("Folder updated successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update folder");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Rename Folder
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Folder Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-full p-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                placeholder="Enter folder name"
                autoFocus
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim() || name === currentName}>
            <Save className="size-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
