import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import DepartmentModal, { type Department as Dept } from "@/components/org/DepartmentModal";
import SectionModal, { type Section } from "@/components/org/SectionModal";
import { useAuth } from "@/contexts/AuthContext";

interface Department {
  id: string;
  name: string;
  code: string;
  plantId: string;
  plant?: { name: string };
  sections?: Section[];
  _count?: { users: number };
}

export default function Departments() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Dept | null>(null);
  
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [activeDeptIdForSection, setActiveDeptIdForSection] = useState<string>("");

  const canManageOrg = ["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN"].includes(user?.role || "");

  const fetchDepartments = () => {
    setIsLoading(true);
    api
      .get("/departments?limit=1000")
      .then(({ data }) => setDepartments(data.data.items ?? data.data))
      .catch(() => setError("Couldn't load departments."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openAddDept = () => {
    setSelectedDept(null);
    setIsDeptModalOpen(true);
  };

  const openEditDept = (dept: Dept) => {
    setSelectedDept(dept);
    setIsDeptModalOpen(true);
  };

  const openAddSection = (deptId: string) => {
    setSelectedSection(null);
    setActiveDeptIdForSection(deptId);
    setIsSectionModalOpen(true);
  };

  const openEditSection = (section: Section, deptId: string) => {
    setSelectedSection(section);
    setActiveDeptIdForSection(deptId);
    setIsSectionModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Departments</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${departments.length} departments`}
          </p>
        </div>
        {canManageOrg && (
          <Button onClick={openAddDept} className="gap-2">
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!isLoading && departments.length > 0 && (
        <div className="border rounded-lg divide-y">
          {departments.map((dept) => (
            <div key={dept.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{dept.name}</h3>
                  <div className="text-xs text-muted-foreground flex gap-2 items-center mt-1">
                    <span>{dept.code}</span>
                    <span>•</span>
                    <span>{dept.plant?.name || "Unknown Plant"}</span>
                  </div>
                </div>
                {canManageOrg && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openAddSection(dept.id)} className="h-8 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Section
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDept(dept)} className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {dept.sections && dept.sections.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {dept.sections.map(sec => (
                    <div key={sec.id} className="bg-background border rounded p-3 flex justify-between items-start group">
                      <div>
                        <p className="text-sm font-medium">{sec.name}</p>
                        {sec.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">{sec.description}</p>}
                      </div>
                      {canManageOrg && (
                        <Button variant="ghost" size="icon" onClick={() => openEditSection(sec, dept.id)} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {isDeptModalOpen && (
        <DepartmentModal
          department={selectedDept}
          onClose={() => setIsDeptModalOpen(false)}
          onSuccess={() => {
            setIsDeptModalOpen(false);
            fetchDepartments();
          }}
        />
      )}

      {isSectionModalOpen && (
        <SectionModal
          section={selectedSection}
          defaultDepartmentId={activeDeptIdForSection}
          onClose={() => setIsSectionModalOpen(false)}
          onSuccess={() => {
            setIsSectionModalOpen(false);
            fetchDepartments();
          }}
        />
      )}
    </div>
  );
}