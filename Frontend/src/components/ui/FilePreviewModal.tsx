import { useEffect, useState } from "react";
import { X, Loader2, Download, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

interface FileItem {
  id: string;
  originalName: string;
  category: string;
}

interface FilePreviewModalProps {
  file: FileItem;
  onClose: () => void;
  onDownload: (file: any) => void | Promise<void>;
}

export default function FilePreviewModal({ file, onClose, onDownload }: FilePreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ext = file.originalName.split('.').pop()?.toLowerCase() || '';
  const isImage = file.category === "IMAGE" || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isVideo = file.category === "VIDEO" || ['mp4', 'webm', 'ogg'].includes(ext);
  
  // react-doc-viewer uses Microsoft Office Online for DOCX/PPTX/XLSX which fails on localhost or authenticated files.
  const isOfficeFile = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(ext);
  const isPreviewable = !isOfficeFile;

  useEffect(() => {
    let url: string | null = null;
    
    const fetchFile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/files/${file.id}/preview`, { responseType: "blob" });
        url = URL.createObjectURL(new Blob([response.data]));
        setBlobUrl(url);
      } catch (err) {
        console.error("Preview failed:", err);
        setError("Failed to load file preview.");
      } finally {
        setIsLoading(false);
      }
    };

    if (isPreviewable) {
      fetchFile();
    } else {
      setIsLoading(false);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, file.category, isPreviewable]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 text-muted-foreground">
          <Loader2 className="size-10 animate-spin text-brand" />
          <p>Loading preview...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 text-destructive">
          <AlertCircle className="size-12 opacity-80" />
          <p>{error}</p>
          <Button onClick={() => onDownload(file)} variant="outline" className="mt-4 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Download className="size-4 mr-2" /> Download Instead
          </Button>
        </div>
      );
    }

    if (!blobUrl && !isPreviewable) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 text-muted-foreground">
          <div className="size-20 bg-muted/50 rounded-full flex items-center justify-center mb-2">
            <AlertCircle className="size-10 opacity-50" />
          </div>
          <p className="text-lg font-medium text-foreground">Preview not available</p>
          <p className="text-sm">This file type ({file.category}) cannot be previewed in the browser.</p>
          <Button onClick={() => onDownload(file)} className="mt-6 bg-brand hover:bg-brand/90 text-white">
            <Download className="size-4 mr-2" /> Download File
          </Button>
        </div>
      );
    }

    if (isImage) {
      return <img src={blobUrl!} alt={file.originalName} className="max-w-full max-h-full object-contain mx-auto" />;
    }
    if (isVideo) {
      return <video src={blobUrl!} controls className="max-w-full max-h-full mx-auto" />;
    }

    const docs = [{ uri: blobUrl!, fileName: file.originalName }];
    
    return (
      <div className="w-full h-full overflow-hidden rounded-b-xl bg-white">
        <DocViewer
          documents={docs}
          pluginRenderers={DocViewerRenderers}
          style={{ width: '100%', height: '100%' }}
          config={{
            header: {
              disableHeader: true,
              disableFileName: true,
              retainURLParams: false
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-4 bg-muted/30">
          <h2 className="font-semibold text-foreground truncate pr-4" title={file.originalName}>
            {file.originalName}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => onDownload(file)} size="sm" variant="outline" className="h-8 border-border/80 hover:bg-muted">
              <Download className="size-4 mr-2" /> Download
            </Button>
            <button 
              onClick={onClose} 
              className="p-2 -mr-2 text-muted-foreground hover:bg-muted/80 hover:text-foreground rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-muted/10 p-4 relative flex flex-col justify-center">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
