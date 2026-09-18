import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export interface Plant {
  id: string;
  name: string;
  code: string;
  location: string;
  email?: string;
  _count?: { departments: number; users: number; files: number };
}

interface Props {
  plant?: Plant | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PlantModal({ plant, onClose, onSuccess }: Props) {
  const isEditing = !!plant;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: plant?.name || "",
    code: plant?.code || "",
    location: plant?.location || "",
    email: plant?.email || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (isEditing) {
        await api.put(`/plants/${plant.id}`, formData);
      } else {
        await api.post("/plants", formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save plant");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground text-lg">{isEditing ? "Edit Plant" : "Add Plant"}</h3>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive text-sm text-destructive flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form id="plant-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Plant Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="e.g. Main Factory"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Plant Code *</label>
              <input
                required
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="e.g. PL-01"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Location *</label>
              <input
                required
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                placeholder="e.g. New York, NY"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="plant-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Plant"}
          </Button>
        </div>
      </div>
    </div>
  );
}
