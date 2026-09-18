import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  plantId: string;
}

interface Props {
  department?: Department | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DepartmentModal({ department, onClose, onSuccess }: Props) {
  const isEditing = !!department;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    name: department?.name || "",
    code: department?.code || "",
    description: department?.description || "",
    plantId: department?.plantId || "",
  });

  useEffect(() => {
    api.get("/plants?limit=1000")
      .then(({ data }) => setPlants(data.data.items || []))
      .catch(() => setError("Failed to load plants."));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (isEditing) {
        await api.put(`/departments/${department.id}`, formData);
      } else {
        await api.post("/departments", formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save department");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground text-lg">{isEditing ? "Edit Department" : "Add Department"}</h3>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive text-sm text-destructive flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form id="department-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Plant *</label>
              <select
                required
                value={formData.plantId}
                onChange={(e) => setFormData({ ...formData, plantId: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="" disabled>Select a plant</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="e.g. Human Resources"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department Code *</label>
              <input
                required
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="e.g. HR"
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
          <Button type="submit" form="department-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Department"}
          </Button>
        </div>
      </div>
    </div>
  );
}
