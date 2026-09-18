import { X, FileText, Calendar, Hash, Tag, Info, User as UserIcon, Shield, Share2 } from "lucide-react";
import { formatFileSize, categoryIcon } from "@/lib/format";

interface FileDetailsModalProps {
  file: any;
  onClose: () => void;
}

export default function FileDetailsModal({ file, onClose }: FileDetailsModalProps) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-brand/10 text-brand rounded-lg shrink-0">
              {categoryIcon(file.category)}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{file.originalName}</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                {file.category} • {formatFileSize(file.fileSize)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Calendar className="size-3.5" /> Uploaded</span>
              <span className="text-sm font-semibold text-foreground">{new Date(file.createdAt).toLocaleString()}</span>
            </div>
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><UserIcon className="size-3.5" /> Created By</span>
              <span className="text-sm font-semibold text-foreground">{file.uploadedBy?.fullName || "System"}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Info className="size-4 text-brand" /> File Information
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Version</span>
                <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-full font-mono font-bold text-xs">v{file.version || 1}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">File Hash</span>
                <span className="text-foreground font-mono text-xs truncate max-w-[200px] bg-muted px-2 py-1 rounded">{file.fileHash || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Your Permission</span>
                <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-md font-semibold text-xs border border-green-500/20">{file.effectivePermission || 'NONE'}</span>
              </div>
            </div>
          </div>

          {file.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <FileText className="size-4 text-brand" /> Description
              </h3>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50 leading-relaxed">
                {file.description}
              </p>
            </div>
          )}
          
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
