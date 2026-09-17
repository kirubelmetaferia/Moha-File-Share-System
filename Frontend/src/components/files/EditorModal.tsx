import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface EditorModalProps {
  fileId: string;
  onClose: () => void;
}

export default function EditorModal({ fileId, onClose }: EditorModalProps) {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const docEditorInstance = useRef<any>(null);

  useEffect(() => {
    // 1. Fetch config from backend
    api.get(`/editor/config/${fileId}`)
      .then(res => {
        setConfig(res.data.data);
      })
      .catch(err => {
        toast.error(err.response?.data?.error || "Failed to load editor config");
        onClose();
      });
  }, [fileId, onClose]);

  useEffect(() => {
    if (!config || !editorRef.current) return;

    // 2. Load OnlyOffice API script
    const scriptUrl = import.meta.env.VITE_ONLYOFFICE_API_URL || "http://localhost:8080/web-apps/apps/api/documents/api.js";
    
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      setIsLoading(false);
      // 3. Initialize editor
      if ((window as any).DocsAPI) {
        docEditorInstance.current = new (window as any).DocsAPI.DocEditor("onlyoffice-placeholder", config);
      }
    };
    script.onerror = () => {
      toast.error("Failed to load OnlyOffice Editor API");
      onClose();
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      if (docEditorInstance.current) {
        docEditorInstance.current.destroyEditor();
      }
    };
  }, [config, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="h-12 bg-muted flex items-center justify-between px-4 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold truncate flex-1">{config?.document?.title || "Document Editor"}</h2>
        <button onClick={onClose} className="p-2 hover:bg-muted-foreground/10 rounded-full transition-colors ml-4">
          <X className="size-5" />
        </button>
      </div>
      
      <div className="flex-1 relative w-full h-full bg-muted/30">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
          </div>
        )}
        <div id="onlyoffice-placeholder" ref={editorRef} className="w-full h-full" />
      </div>
    </div>
  );
}
