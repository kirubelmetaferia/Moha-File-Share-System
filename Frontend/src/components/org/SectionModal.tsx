import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export interface Section {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  department?: {
    name: string;
  };
}

interface Props {
  section?: Section | null;
  defaultDepartmentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SectionModal({ section, defaultDepartmentId, onClose, onSuccess }: Props) {
  const isEditing = !!section;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    name: section?.name || "",
    description: section?.description || "",
    departmentId: section?.departmentId || defaultDepartmentId || "",
  });

  useEffect(() => {
    api.get("/departments?limit=1000")
      .then(({ data }) => setDepartments(data.data.items || data.data || []))
      .catch(() => setError("Failed to load departments."));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (isEditing) {
        await api.put(`/sections/${section.id}`, formData);
      } else {
        await api.post("/sections", formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save section");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground text-lg">{isEditing ? "Edit Section" : "Add Section"}</h3>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive text-sm text-destructive flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form id="section-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department *</label>
              <select
                required
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="" disabled>Select a department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Section Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="e.g. Payroll"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 rounded-md border border-input bg-background text-sm resize-none"
                rows={3}
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="section-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Section"}
          </Button>
        </div>
      </div>
    </div>
  );
}
