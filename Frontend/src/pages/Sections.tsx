import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Edit2 } from "lucide-react";
import SectionModal, { type Section } from "@/components/org/SectionModal";
import { useAuth } from "@/contexts/AuthContext";

export default function Sections() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  const canManageOrg = ["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN", "DEPARTMENT_HEAD"].includes(user?.role || "");

  const fetchSections = () => {
    setIsLoading(true);
    api
      .get("/sections?limit=1000")
      .then(({ data }) => setSections(data.data.items ?? data.data))
      .catch(() => setError("Couldn't load sections."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const openAddSection = () => {
    setSelectedSection(null);
    setIsSectionModalOpen(true);
  };

  const openEditSection = (section: Section) => {
    setSelectedSection(section);
    setIsSectionModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Sections</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${sections.length} sections`}
          </p>
        </div>
        {canManageOrg && (
          <Button onClick={openAddSection} className="gap-2">
            <Plus className="h-4 w-4" /> Add Section
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!isLoading && sections.length > 0 && (
        <div className="border rounded-lg divide-y">
          {sections.map((section) => (
            <div key={section.id} className="p-5 flex items-start justify-between">
              <div>
                <h3 className="font-medium text-foreground">{section.name}</h3>
                <div className="text-xs text-muted-foreground mt-1">
                  {section.description && <span>{section.description}</span>}
                  {section.department && (
                    <span className="block mt-0.5">
                      Department: <span className="font-medium">{section.department.name}</span>
                    </span>
                  )}
                </div>
              </div>
              {canManageOrg && (
                <Button variant="ghost" size="icon" onClick={() => openEditSection(section)} className="h-8 w-8">
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {isSectionModalOpen && (
        <SectionModal
          section={selectedSection}
          onClose={() => setIsSectionModalOpen(false)}
          onSuccess={() => {
            setIsSectionModalOpen(false);
            fetchSections();
          }}
        />
      )}
    </div>
  );
}
