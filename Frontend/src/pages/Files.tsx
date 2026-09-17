import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatFileSize, categoryIcon } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import ShareDialog from "@/components/ui/ShareDialog";
import FilePreviewModal from "@/components/ui/FilePreviewModal";
import FileVersionModal from "@/components/ui/FileVersionModal";
import MoveCopyModal from "@/components/ui/MoveCopyModal";
import FileDetailsModal from "@/components/ui/FileDetailsModal";
import FileActivityModal from "@/components/ui/FileActivityModal";
import EditorModal from "@/components/files/EditorModal";
import CloudImportModal from "@/components/files/CloudImportModal";
import EditFolderModal from "@/components/files/EditFolderModal";
import { LayoutGrid, List, Search, UploadCloud, Folder, ChevronRight, History, MoreVertical, FileText, Trash2, MoveRight, CopyPlus, Share2, Download, Info, Eye, Cloud, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

interface FileItem {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  category: string;
  description: string | null;
  createdAt: string;
  version: number;
  uploadedBy: { id: string; fullName: string; employeeId: string };
  effectivePermission?: string;
}

interface FolderItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string };
  effectivePermission?: string;
}

const PERM_LEVELS: Record<string, number> = {
  NONE: 0, VIEW: 1, DOWNLOAD: 2, MODIFY_ONLINE: 3, MODIFY: 4, DELETE: 5, UPLOAD: 6
};

const hasPerm = (effective: string | undefined, required: string) => {
  return (PERM_LEVELS[effective || 'NONE'] || 0) >= (PERM_LEVELS[required] || 0);
};

const CATEGORIES = ["DOCUMENT", "SPREADSHEET", "PRESENTATION", "PDF", "IMAGE", "VIDEO", "OTHER"];

export default function Files() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Root" }]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [sharingItem, setSharingItem] = useState<{ type: 'file'|'folder', item: any } | null>(null);
  const [editFolder, setEditFolder] = useState<FolderItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [editorFile, setEditorFile] = useState<FileItem | null>(null);
  const [versionFile, setVersionFile] = useState<FileItem | null>(null);
  const [moveCopyItem, setMoveCopyItem] = useState<{ file: FileItem, action: 'move'|'copy' } | null>(null);
  const [detailsFile, setDetailsFile] = useState<FileItem | null>(null);
  const [activityFile, setActivityFile] = useState<FileItem | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCloudImporting, setIsCloudImporting] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const loadData = async (folderId: string | null) => {
    setIsLoading(true);
    setError("");
    try {
      const fileParam = folderId ? `&folderId=${folderId}` : "&folderId=null";
      const folderParam = folderId ? `&parentFolderId=${folderId}` : "&parentFolderId=null";
      const [filesRes, foldersRes] = await Promise.all([
        api.get(`/files?limit=100${fileParam}`),
        api.get(`/folders?limit=100${folderParam}`)
      ]);
      setFiles(filesRes.data.data.items);
      setFolders(foldersRes.data.data);
    } catch {
      setError("Couldn't load files and folders. Try refreshing.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentFolderId);
  }, [currentFolderId]);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const visibleFiles = files.filter((file) => {
    const matchesSearch = file.originalName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || file.category === category;
    return matchesSearch && matchesCategory;
  });

  const visibleFolders = folders.filter((folder) => {
    return folder.name.toLowerCase().includes(search.toLowerCase());
  });

  async function uploadFile(file: File) {
    setIsUploading(true);
    setError("");
    
    // Determine category based on file type
    const type = file.type;
    let fileCategory = "OTHER";
    if (type.startsWith("image/")) fileCategory = "IMAGE";
    else if (type.startsWith("video/")) fileCategory = "VIDEO";
    else if (type === "application/pdf") fileCategory = "PDF";
    else if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv")) fileCategory = "SPREADSHEET";
    else if (type.includes("presentation") || type.includes("powerpoint")) fileCategory = "PRESENTATION";
    else if (type.includes("document") || type.includes("word") || type === "text/plain") fileCategory = "DOCUMENT";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", fileCategory);
    if (currentFolderId) {
      formData.append("folderId", currentFolderId);
    }
    if (user?.plantId) formData.append("plantId", user.plantId);
    if (user?.departmentId) formData.append("departmentId", user.departmentId);
    if (user?.sectionId) formData.append("sectionId", user.sectionId);

    try {
      await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadData(currentFolderId);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Upload failed. Check the file type and size.");
    } finally {
      setIsUploading(false);
    }
  }

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
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to create folder.");
    }
  }

  async function handleDeleteFolder(folder: FolderItem) {
    if (!confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents?`)) return;
    try {
      await api.delete(`/folders/${folder.id}`);
      toast.success("Folder deleted successfully");
      loadData(currentFolderId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete folder");
    }
  }

  const navigateToFolder = (id: string | null, name: string) => {
    setCurrentFolderId(id);
    if (id === null) {
      setBreadcrumbs([{ id: null, name: "Root" }]);
    } else {
      const idx = breadcrumbs.findIndex(b => b.id === id);
      if (idx >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, { id, name }]);
      }
    }
    setSearch("");
    setCategory("");
  };

  const handleFileClick = (file: FileItem) => {
    const ext = file.originalName.split('.').pop()?.toLowerCase() || '';
    const isOfficeFile = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'csv', 'rtf', 'txt'].includes(ext);
    const perm = file.effectivePermission || 'NONE';
    const canModifyOnline = hasPerm(perm, 'MODIFY_ONLINE');
    
    if (isOfficeFile && canModifyOnline) {
      setEditorFile(file);
    } else {
      setPreviewFile(file);
    }
  };

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setIsUploading(true);
    setError("");

    try {
      const paths = new Set<string>();
      files.forEach(f => {
        const parts = f.webkitRelativePath.split('/');
        parts.pop(); // remove file name
        let currentPath = "";
        for (const p of parts) {
          currentPath = currentPath ? `${currentPath}/${p}` : p;
          paths.add(currentPath);
        }
      });

      const sortedPaths = Array.from(paths).sort((a, b) => a.split('/').length - b.split('/').length);
      const folderIdMap = new Map<string, string>();
      folderIdMap.set("", currentFolderId || "");

      for (const path of sortedPaths) {
        const parts = path.split('/');
        const folderName = parts.pop()!;
        const parentPath = parts.join('/');
        const parentId = folderIdMap.get(parentPath);

        const res = await api.post("/folders", {
          name: folderName,
          parentFolderId: parentId || null,
          plantId: user?.plantId,
          departmentId: user?.departmentId,
          sectionId: user?.sectionId
        });
        
        folderIdMap.set(path, res.data.data.id);
      }

      for (const file of files) {
        const parts = file.webkitRelativePath.split('/');
        parts.pop();
        const parentPath = parts.join('/');
        const folderId = folderIdMap.get(parentPath);

        const type = file.type;
        let fileCategory = "OTHER";
        if (type.startsWith("image/")) fileCategory = "IMAGE";
        else if (type.startsWith("video/")) fileCategory = "VIDEO";
        else if (type === "application/pdf") fileCategory = "PDF";
        else if (type.includes("spreadsheet") || type.includes("excel") || type.includes("csv")) fileCategory = "SPREADSHEET";
        else if (type.includes("presentation") || type.includes("powerpoint")) fileCategory = "PRESENTATION";
        else if (type.includes("document") || type.includes("word") || type === "text/plain") fileCategory = "DOCUMENT";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", fileCategory);
        if (folderId) {
          formData.append("folderId", folderId);
        }
        if (user?.plantId) formData.append("plantId", user.plantId);
        if (user?.departmentId) formData.append("departmentId", user.departmentId);
        if (user?.sectionId) formData.append("sectionId", user.sectionId);

        await api.post("/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      await loadData(currentFolderId);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Folder upload failed.");
    } finally {
      setIsUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  async function handleDownload(file: FileItem) {
    try {
      const response = await api.get(`/files/${file.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.originalName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download file.");
    }
  }

  async function handleDelete(file: FileItem) {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await api.delete(`/files/${file.id}`);
      toast.success("File moved to recycle bin");
      loadData(currentFolderId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete file");
    }
  }

  function FileActions({ file }: { file: FileItem }) {
    const perm = file.effectivePermission || 'NONE';
    const canDownload = hasPerm(perm, 'DOWNLOAD');
    const canModify = hasPerm(perm, 'MODIFY');
    const canDelete = hasPerm(perm, 'DELETE');
    const canShare = user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_ADMIN' || file.uploadedBy.id === user?.id || hasPerm(perm, 'UPLOAD');
    const isOpen = activeDropdown === file.id;
  
    return (
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button onClick={() => setActiveDropdown(isOpen ? null : file.id)} className="p-1 hover:bg-muted rounded text-muted-foreground transition-colors hover:text-foreground">
          <MoreVertical className="size-4" />
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50 overflow-hidden">
            {canShare && (
              <button onClick={() => { setActiveDropdown(null); setSharingItem({ type: 'file', item: file }); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
                <Share2 className="size-4 opacity-70" /> Share
              </button>
            )}
            {canDownload && (
              <button onClick={() => { setActiveDropdown(null); handleDownload(file); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
                <Download className="size-4 opacity-70" /> Download
              </button>
            )}
            <button onClick={() => { setActiveDropdown(null); setVersionFile(file); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
              <History className="size-4 opacity-70" /> Versions
            </button>
            <button onClick={() => { setActiveDropdown(null); setDetailsFile(file); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
              <Info className="size-4 opacity-70" /> Details
            </button>
            {canShare && (
              <button onClick={() => { setActiveDropdown(null); setActivityFile(file); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
                <Eye className="size-4 opacity-70" /> Activity
              </button>
            )}
            {canModify && (
              <>
                <div className="h-px bg-border my-1" />
                <button onClick={() => { setActiveDropdown(null); setMoveCopyItem({ file, action: 'move' }); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
                  <MoveRight className="size-4 opacity-70" /> Move
                </button>
                <button onClick={() => { setActiveDropdown(null); setMoveCopyItem({ file, action: 'copy' }); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
                  <CopyPlus className="size-4 opacity-70" /> Copy
                </button>
              </>
            )}
            {canDelete && (
              <>
                <div className="h-px bg-border my-1" />
                <button onClick={() => { setActiveDropdown(null); handleDelete(file); }} className="w-full text-left px-3 py-2 text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2 font-medium">
                  <Trash2 className="size-4 opacity-70" /> Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="p-4 sm:p-8 max-w-6xl mx-auto relative h-full flex flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-40 bg-brand/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-card border-2 border-dashed border-brand rounded-2xl px-12 py-10 flex flex-col items-center gap-3">
            <UploadCloud className="size-10 text-brand" />
            <p className="text-foreground font-medium">Drop to upload here</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            File Manager
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
          <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
          <input ref={folderInputRef} type="file" {...{ webkitdirectory: "", directory: "" }} multiple onChange={handleFolderSelect} className="hidden" />
          <Button
            onClick={() => setIsCreatingFolder(true)}
            variant="outline"
            className="border-border hover:bg-muted"
          >
            <Folder className="size-4 mr-2" />
            New Folder
          </Button>
          <Button
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            className="border-border hover:bg-muted"
          >
            <UploadCloud className="size-4 mr-2" />
            {isUploading ? "..." : "Upload Folder"}
          </Button>
          <Button
            onClick={() => setIsCloudImporting(true)}
            variant="outline"
            className="border-border hover:bg-muted"
          >
            <Cloud className="size-4 mr-2 text-blue-500" />
            Cloud Import
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-brand hover:bg-brand/90 text-white"
          >
            <UploadCloud className="size-4 mr-2" />
            {isUploading ? "Uploading…" : "Upload File"}
          </Button>
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

      {/* Search, filter, view toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files and folders…"
            className="w-full pl-9 bg-card"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-card text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          <button onClick={() => setView("grid")} className={`h-10 w-10 flex items-center justify-center transition-colors ${view === "grid" ? "bg-brand text-white" : "bg-card text-muted-foreground hover:bg-muted/50"}`}>
            <LayoutGrid className="size-4" />
          </button>
          <button onClick={() => setView("list")} className={`h-10 w-10 flex items-center justify-center transition-colors ${view === "list" ? "bg-brand text-white" : "bg-card text-muted-foreground hover:bg-muted/50"}`}>
            <List className="size-4" />
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-4" role="alert">{error}</p>}

      {/* Grid View */}
      {view === "grid" && (
        <div className="flex-1 overflow-y-auto pb-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="border border-border/50 rounded-xl p-4 space-y-3">
                  <Skeleton className="h-12 w-12 mx-auto rounded-lg" />
                  <Skeleton className="h-4 w-2/3 mx-auto" />
                </div>
              ))}
            </div>
          ) : visibleFolders.length === 0 && visibleFiles.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center mt-4">
              <Folder className="size-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-1">This folder is empty.</p>
              <p className="text-xs text-muted-foreground">Drag files here to upload.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {visibleFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => navigateToFolder(folder.id, folder.name)}
                  className="group relative text-left border border-border rounded-xl p-4 bg-card transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/40"
                >
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                    <Folder className="size-6 fill-current opacity-80" />
                  </div>
                  <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_ADMIN' || folder.createdBy.id === user?.id) && (
                      <Button onClick={(e) => { e.stopPropagation(); setSharingItem({ type: 'folder', item: folder }); }} size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-brand/10 hover:text-brand" title="Share folder">
                        Share
                      </Button>
                    )}
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_ADMIN' || folder.createdBy.id === user?.id || hasPerm(folder.effectivePermission, 'MODIFY')) && (
                      <Button onClick={(e) => { e.stopPropagation(); setEditFolder(folder); }} size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-blue-500/10 hover:text-blue-500" title="Rename folder">
                        <Edit2 className="size-3.5" />
                      </Button>
                    )}
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_ADMIN' || folder.createdBy.id === user?.id || hasPerm(folder.effectivePermission, 'DELETE')) && (
                      <Button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }} size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive" title="Delete folder">
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">Folder</p>
                </button>
              ))}

              {visibleFiles.map(file => (
                <div key={file.id} className="group relative border border-border rounded-xl p-4 bg-card transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-brand/40 flex flex-col">
                  <div 
                    onClick={() => setPreviewFile(file)}
                    className="cursor-pointer flex flex-col h-full"
                  >
                    <div className="h-12 w-12 rounded-lg bg-brand/5 flex items-center justify-center text-2xl mb-3">
                      {categoryIcon(file.category)}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate" title={file.originalName}>{file.originalName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                      {file.version > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground" title={`${file.version} versions`}>
                          v{file.version}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex">
                    <FileActions file={file} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="flex-1 overflow-y-auto pb-8">
          {isLoading ? (
            <div className="border border-border/50 rounded-lg divide-y divide-border/50">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center p-3 gap-4">
                  <Skeleton className="h-8 w-8 rounded shrink-0" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-border rounded-xl bg-card overflow-hidden divide-y divide-border/50 shadow-sm">
              <div className="grid grid-cols-12 gap-4 p-3 bg-muted/30 text-xs font-semibold text-muted-foreground">
                <div className="col-span-6 sm:col-span-5">Name</div>
                <div className="hidden sm:block col-span-3">Owner</div>
                <div className="col-span-3 sm:col-span-2">Size</div>
                <div className="col-span-3 sm:col-span-2 text-right">Actions</div>
              </div>
              
              {visibleFolders.map(folder => (
                <div key={folder.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/40 transition-all duration-200 group border-l-2 border-transparent hover:border-brand/50">
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                    <Folder className="size-5 text-blue-500 fill-current opacity-80 shrink-0" />
                    <button onClick={() => navigateToFolder(folder.id, folder.name)} className="text-sm font-medium truncate hover:text-brand text-left">
                      {folder.name}
                    </button>
                  </div>
                  <div className="hidden sm:block col-span-3 text-sm text-muted-foreground truncate">{folder.createdBy.fullName}</div>
                  <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground">-</div>
                  <div className="col-span-3 sm:col-span-2 text-right opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_ADMIN' || folder.createdBy.id === user?.id) && (
                      <Button onClick={(e) => { e.stopPropagation(); setSharingItem({ type: 'folder', item: folder }); }} size="sm" variant="ghost" className="h-7 px-2 text-xs rounded hover:bg-brand/10 hover:text-brand">Share</Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigateToFolder(folder.id, folder.name)}>Open</Button>
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_ADMIN' || folder.createdBy.id === user?.id || hasPerm(folder.effectivePermission, 'MODIFY')) && (
                      <Button onClick={(e) => { e.stopPropagation(); setEditFolder(folder); }} size="sm" variant="ghost" className="h-7 w-7 p-0 rounded hover:bg-blue-500/10 hover:text-blue-500"><Edit2 className="size-3.5" /></Button>
                    )}
                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'PLANT_ADMIN' || folder.createdBy.id === user?.id || hasPerm(folder.effectivePermission, 'DELETE')) && (
                      <Button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }} size="sm" variant="ghost" className="h-7 w-7 p-0 rounded hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                    )}
                  </div>
                </div>
              ))}

              {visibleFiles.map(file => (
                <div key={file.id} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/40 transition-all duration-200 group border-l-2 border-transparent hover:border-brand/50">
                  <div 
                    className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0 cursor-pointer"
                    onClick={() => handleFileClick(file)}
                  >
                    <span className="text-lg shrink-0 w-5 text-center">{categoryIcon(file.category)}</span>
                    <div className="min-w-0 flex flex-col">
                      <span className="text-sm font-medium truncate hover:text-brand" title={file.originalName}>{file.originalName}</span>
                      {file.version > 1 && <span className="text-[10px] text-muted-foreground">Version {file.version}</span>}
                    </div>
                  </div>
                  <div className="hidden sm:block col-span-3 text-sm text-muted-foreground truncate">{file.uploadedBy.fullName}</div>
                  <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground">{formatFileSize(file.fileSize)}</div>
                  <div className="col-span-3 sm:col-span-2 text-right opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                    <FileActions file={file} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editFolder && (
        <EditFolderModal
          folderId={editFolder.id}
          currentName={editFolder.name}
          onClose={() => setEditFolder(null)}
          onSuccess={() => { setEditFolder(null); loadData(currentFolderId); }}
        />
      )}

      {sharingItem && (
        <ShareDialog
          fileId={sharingItem.type === 'file' ? sharingItem.item.id : undefined}
          folderId={sharingItem.type === 'folder' ? sharingItem.item.id : undefined}
          itemName={sharingItem.type === 'file' ? sharingItem.item.originalName : sharingItem.item.name}
          onClose={() => setSharingItem(null)}
          onShared={() => loadData(currentFolderId)}
        />
      )}

      {editorFile && (
        <EditorModal fileId={editorFile.id} onClose={() => setEditorFile(null)} />
      )}

      {isCloudImporting && (
        <CloudImportModal
          folderId={currentFolderId}
          onClose={() => setIsCloudImporting(false)}
          onSuccess={() => {
            setIsCloudImporting(false);
            loadData(currentFolderId);
          }}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownload}
        />
      )}

      {versionFile && (
        <FileVersionModal
          fileId={versionFile.id}
          fileName={versionFile.originalName}
          onClose={() => setVersionFile(null)}
          onRestored={() => loadData(currentFolderId)}
        />
      )}

      {moveCopyItem && (
        <MoveCopyModal
          fileId={moveCopyItem.file.id}
          fileName={moveCopyItem.file.originalName}
          action={moveCopyItem.action}
          onClose={() => setMoveCopyItem(null)}
          onSuccess={() => loadData(currentFolderId)}
        />
      )}

      {detailsFile && (
        <FileDetailsModal
          file={detailsFile}
          onClose={() => setDetailsFile(null)}
        />
      )}

      {activityFile && (
        <FileActivityModal
          file={activityFile}
          onClose={() => setActivityFile(null)}
        />
      )}
    </div>
  );
}