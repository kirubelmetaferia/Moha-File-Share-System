import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, ChevronDown, CheckSquare, Square, X, Loader2, Search } from "lucide-react";

interface Props {
  fileId?: string;
  folderId?: string;
  itemName: string;
  onClose: () => void;
  onShared: () => void;
}

type TargetType = "USER" | "DEPARTMENT" | "PLANT" | "SECTION";
const PERMISSIONS = ["VIEW", "EDIT", "DELETE", "SHARE", "FULL_CONTROL"];

interface UserData { id: string; fullName: string; plantId: string | null; departmentId: string | null; sectionId: string | null; }
interface DepartmentData { id: string; name: string; plantId: string | null; }
interface SectionData { id: string; name: string; departmentId: string | null; }
interface PlantData { id: string; name: string; }

interface SelectedTarget {
  type: TargetType;
  id?: string;
  name: string;
}

interface TreeNode {
  nodeId: string;
  type: TargetType;
  id?: string; // DB ID (empty for EVERYONE or purely visual folders)
  name: string;
  children: TreeNode[];
}

export default function ShareDialog({ fileId, folderId, itemName, onClose, onShared }: Props) {
  const [selectedTargets, setSelectedTargets] = useState<SelectedTarget[]>([]);
  const [permissionsState, setPermissionsState] = useState({
    view: true,
    edit: false,
    delete: false,
    share: false,
    fullControl: false,
  });

  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [plants, setPlants] = useState<PlantData[]>([]);

  const handleCheckboxChange = (name: keyof typeof permissionsState, checked: boolean) => {
    if (name === "fullControl") {
      setPermissionsState((prev) => ({
        ...prev,
        fullControl: checked,
        view: checked ? true : prev.view,
        edit: checked ? true : prev.edit,
        delete: checked ? true : prev.delete,
        share: checked ? true : prev.share,
      }));
    } else {
      setPermissionsState((prev) => ({
        ...prev,
        [name]: checked,
      }));
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { user: currentUser } = useAuth();
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plantsRes, deptsRes, secsRes, usersRes] = await Promise.all([
          api.get("/plants?limit=1000&scope=all"),
          api.get("/departments?limit=1000&scope=all"),
          api.get("/sections?limit=1000&scope=all"),
          api.get("/users?limit=1000&scope=all")
        ]);
        setPlants(plantsRes.data.data.items || plantsRes.data.data);
        setDepartments(deptsRes.data.data.items || deptsRes.data.data);
        setSections(secsRes.data.data.items || secsRes.data.data);
        
        const allUsers = usersRes.data.data.items || usersRes.data.data;
        setUsers(allUsers.filter((u: any) => u.id !== currentUser?.id));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser?.id]);

  // Build Tree
  const treeData = useMemo(() => {
    if (isLoading) return [];

    const root: TreeNode[] = [];

    // 1. Plants

    // 2. Plants
    plants.forEach(plant => {
      const plantNode: TreeNode = {
        nodeId: `PLANT_${plant.id}`,
        type: "PLANT",
        id: plant.id,
        name: plant.name,
        children: []
      };

      // Departments in this plant
      const plantDepts = departments.filter(d => d.plantId === plant.id);
      plantDepts.forEach(dept => {
        const deptNode: TreeNode = {
          nodeId: `DEPT_${dept.id}`,
          type: "DEPARTMENT",
          id: dept.id,
          name: dept.name,
          children: []
        };

        // Sections in this dept
        const deptSecs = sections.filter(s => s.departmentId === dept.id);
        deptSecs.forEach(sec => {
          const secNode: TreeNode = {
            nodeId: `SEC_${sec.id}`,
            type: "SECTION",
            id: sec.id,
            name: sec.name,
            children: []
          };

          // Users in this section
          const secUsers = users.filter(u => u.sectionId === sec.id);
          secUsers.forEach(u => {
            secNode.children.push({
              nodeId: `USER_${u.id}`,
              type: "USER",
              id: u.id,
              name: u.fullName,
              children: []
            });
          });
          deptNode.children.push(secNode);
        });

        // Users in dept but no section
        const deptUsers = users.filter(u => u.departmentId === dept.id && !u.sectionId);
        deptUsers.forEach(u => {
          deptNode.children.push({
            nodeId: `USER_${u.id}`,
            type: "USER",
            id: u.id,
            name: u.fullName,
            children: []
          });
        });

        plantNode.children.push(deptNode);
      });

      // Users in plant but no dept
      const plantUsers = users.filter(u => u.plantId === plant.id && !u.departmentId);
      plantUsers.forEach(u => {
        plantNode.children.push({
          nodeId: `USER_${u.id}`,
          type: "USER",
          id: u.id,
          name: u.fullName,
          children: []
        });
      });

      root.push(plantNode);
    });

    // 3. Global Users (No Plant)
    const globalUsers = users.filter(u => !u.plantId);
    if (globalUsers.length > 0) {
      const globalNode: TreeNode = {
        nodeId: "GLOBAL_USERS",
        type: "USER" as any, // Not selectable as a group, purely visual folder
        id: "",
        name: "Global Users (No Plant)",
        children: []
      };
      globalUsers.forEach(u => {
        globalNode.children.push({
          nodeId: `USER_${u.id}`,
          type: "USER",
          id: u.id,
          name: u.fullName,
          children: []
        });
      });
      root.push(globalNode);
    }

    return root;
  }, [plants, departments, sections, users, isLoading]);

  const filteredTreeData = useMemo(() => {
    if (!searchTerm.trim()) return treeData;
    
    const lowerSearch = searchTerm.toLowerCase();

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const matches = node.name.toLowerCase().includes(lowerSearch);
        const filteredChildren = filterNodes(node.children);
        
        if (matches || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, []);
    };

    return filterNodes(treeData);
  }, [treeData, searchTerm]);

  const toggleExpand = (nodeId: string) => {
    const next = new Set(expandedNodes);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    setExpandedNodes(next);
  };

  const toggleSelection = (node: TreeNode) => {
    // Purely visual folders can't be selected
    if (node.nodeId === "GLOBAL_USERS") return;

    const isSelected = selectedTargets.some(t => t.type === node.type && t.id === node.id);
    
    if (isSelected) {
      setSelectedTargets(selectedTargets.filter(t => !(t.type === node.type && t.id === node.id)));
    } else {
      setSelectedTargets([...selectedTargets, { type: node.type, id: node.id, name: node.name }]);
    }
  };

  const removeTarget = (index: number) => {
    setSelectedTargets(selectedTargets.filter((_, i) => i !== index));
  };

  async function handleShare() {
    setError("");

    if (selectedTargets.length === 0) {
      setError("Please select at least one recipient.");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetsPayload = selectedTargets.map(t => ({
        type: t.type,
        id: t.id
      }));

      let finalPermission = "VIEW";
      if (permissionsState.fullControl) finalPermission = "UPLOAD";
      else if (permissionsState.share) finalPermission = "UPLOAD"; // Highest level for sharing
      else if (permissionsState.delete) finalPermission = "DELETE";
      else if (permissionsState.edit) finalPermission = "MODIFY";

      await api.post("/shares", {
        fileId,
        folderId,
        targets: targetsPayload,
        permission: finalPermission
      });
      onShared();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Couldn't share the file.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Recursive Tree Node Renderer
  const renderTree = (nodes: TreeNode[], depth = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedNodes.has(node.nodeId) || searchTerm.length > 0;
      const isSelectable = node.nodeId !== "GLOBAL_USERS";
      const isSelected = isSelectable && selectedTargets.some(t => t.type === node.type && t.id === node.id);
      
      const hasChildren = node.children.length > 0;

      let icon = "👤";
      if (node.type === "SECTION") icon = "🤝";
      if (node.type === "DEPARTMENT") icon = "🏢";
      if (node.type === "PLANT") icon = "🏭";
      if (node.nodeId === "GLOBAL_USERS") icon = "📁";

      return (
        <div key={node.nodeId} className="flex flex-col">
          <div 
            className={`flex items-center py-1.5 px-2 hover:bg-muted/50 rounded-md transition-colors ${depth > 0 ? "mt-0.5" : ""}`}
            style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
          >
            {/* Expand/Collapse Button */}
            <div className="w-5 flex justify-center mr-1">
              {hasChildren ? (
                <button 
                  onClick={() => toggleExpand(node.nodeId)}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                >
                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
              ) : (
                <span className="w-4" />
              )}
            </div>

            {/* Checkbox */}
            {isSelectable && (
              <button 
                onClick={() => toggleSelection(node)}
                className="text-muted-foreground hover:text-brand mr-2 focus:outline-none"
              >
                {isSelected ? (
                  <CheckSquare className="size-4 text-brand" />
                ) : (
                  <Square className="size-4" />
                )}
              </button>
            )}

            {/* Label */}
            <div 
              className="flex items-center gap-2 cursor-pointer select-none overflow-hidden" 
              onClick={() => hasChildren ? toggleExpand(node.nodeId) : (isSelectable && toggleSelection(node))}
            >
              <span>{icon}</span>
              <span className={`text-sm truncate ${isSelected ? 'font-medium text-foreground' : 'text-foreground/80'}`}>
                {node.name}
              </span>
            </div>
          </div>
          
          {/* Children */}
          {hasChildren && isExpanded && (
            <div className="flex flex-col">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-2xl flex flex-col max-h-[90vh] shadow-xl">
        <div className="mb-4 shrink-0 flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-foreground text-lg">Share {folderId ? 'folder' : 'file'}</h3>
            <p className="text-sm text-muted-foreground truncate max-w-sm" title={itemName}>{itemName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-brand mb-4" />
            <p className="text-sm text-muted-foreground">Loading organization structure...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6 min-h-[400px]">
            {/* Left: Tree View */}
            <div className="flex-1 flex flex-col border border-border rounded-lg bg-muted/10 overflow-hidden">
              <div className="p-3 bg-muted/30 border-b border-border flex flex-col gap-2">
                <div className="text-sm font-medium text-foreground">
                  Select Recipients
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1.5 size-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search people, departments..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {renderTree(filteredTreeData)}
              </div>
            </div>

            {/* Right: Selected & Config */}
            <div className="w-full md:w-64 flex flex-col gap-6 shrink-0">
              <div className="flex-1 flex flex-col">
                <h4 className="text-sm font-medium text-foreground mb-3">Selected ({selectedTargets.length})</h4>
                <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-background p-2">
                  {selectedTargets.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-8">No recipients selected.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {selectedTargets.map((target, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-1.5 bg-brand/5 border border-brand/20 text-foreground text-xs px-2 py-1.5 rounded-md group">
                          <span className="truncate" title={target.name}>
                            {target.type === "USER" && "👤 "}
                            {target.type === "SECTION" && "🤝 "}
                            {target.type === "DEPARTMENT" && "🏢 "}
                            {target.type === "PLANT" && "🏭 "}
                            {target.name}
                          </span>
                          <button 
                            onClick={() => removeTarget(idx)}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 shrink-0 flex-1 overflow-y-auto">
                <label className="text-sm font-medium text-foreground mb-2 block">Permission Level</label>
                <div className="space-y-2">
                  {[
                    { id: "fullControl", label: "Full Control", description: "Grants all access and permissions." },
                    { id: "view", label: "View", description: "Can view files and folders." },
                    { id: "edit", label: "Edit", description: "Can modify existing files." },
                    { id: "delete", label: "Delete", description: "Can delete files." },
                    { id: "share", label: "Share", description: "Can share files with other users." },
                  ].map((perm) => (
                    <div
                      key={perm.id}
                      className={`flex items-start space-x-2.5 p-2 rounded-lg border transition-colors ${
                        permissionsState[perm.id as keyof typeof permissionsState]
                          ? "bg-teal-500/10 border-teal-500/30"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id={perm.id}
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded border-border text-teal-600 focus:ring-teal-500 disabled:opacity-50 cursor-pointer accent-teal-600"
                          checked={permissionsState[perm.id as keyof typeof permissionsState]}
                          disabled={perm.id !== "fullControl" && permissionsState.fullControl}
                          onChange={(e) =>
                            handleCheckboxChange(perm.id as keyof typeof permissionsState, e.target.checked)
                          }
                        />
                      </div>
                      <div className="flex flex-col">
                        <label
                          htmlFor={perm.id}
                          className={`text-xs font-medium leading-none cursor-pointer ${
                            perm.id !== "fullControl" && permissionsState.fullControl ? "opacity-50" : "text-foreground"
                          }`}
                        >
                          {perm.label}
                        </label>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                          {perm.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}

        <div className="flex gap-2 justify-end pt-4 border-t border-border mt-4 shrink-0">
          <Button onClick={onClose} className="bg-transparent hover:bg-muted text-foreground border border-border">
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSubmitting || selectedTargets.length === 0 || isLoading}
            className="bg-brand hover:opacity-90 text-white min-w-[100px] shadow-sm"
          >
            {isSubmitting ? "Sharing…" : "Share"}
          </Button>
        </div>
      </div>
    </div>
  );
}