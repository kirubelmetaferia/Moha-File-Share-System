import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export interface User {
  id: string;
  fullName: string;
  employeeId: string;
  email: string;
  role: string;
  isActive: boolean;
  plantId: string | null;
  departmentId: string | null;
  sectionId: string | null;
}

interface Props {
  user?: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = ["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN", "DEPARTMENT_HEAD", "SECTION_HEAD", "EMPLOYEE", "VIEWER"];

export default function UserModal({ user, onClose, onSuccess }: Props) {
  const { user: currentUser } = useAuth();
  const isEditing = !!user;
  
  const allowedRoles = ROLES.filter(r => {
    if (currentUser?.role === 'SUPER_ADMIN') return true;
    if (currentUser?.role === 'ADMIN') return r !== 'SUPER_ADMIN' && r !== 'ADMIN' && r !== 'PLANT_ADMIN';
    if (currentUser?.role === 'PLANT_ADMIN') return r !== 'SUPER_ADMIN' && r !== 'PLANT_ADMIN';
    if (currentUser?.role === 'DEPARTMENT_HEAD') return r === 'SECTION_HEAD' || r === 'EMPLOYEE' || r === 'VIEWER';
    if (currentUser?.role === 'SECTION_HEAD') return r === 'EMPLOYEE' || r === 'VIEWER';
    return false;
  });

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    employeeId: user?.employeeId || "",
    password: "",
    confirmPassword: "",
    role: user?.role || (allowedRoles.length > 0 ? allowedRoles[0] : "EMPLOYEE"),
    isActive: user ? user.isActive : true,
    plantId: user?.plantId || "",
    departmentId: user?.departmentId || "",
    sectionId: user?.sectionId || "",
  });

  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; plantId: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; departmentId: string }[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch plants, departments, and sections to populate dropdowns
    Promise.all([
      api.get("/plants?limit=1000"), 
      api.get("/departments?limit=1000"),
      api.get("/sections?limit=1000")
    ])
      .then(([plantsRes, deptsRes, sectionsRes]) => {
        setPlants(plantsRes.data.data.items || plantsRes.data.data);
        setDepartments(deptsRes.data.data.items || deptsRes.data.data);
        setSections(sectionsRes.data.data.items || sectionsRes.data.data);
      })
      .catch(() => {
        setError("Failed to load plants, departments, or sections.");
      });
  }, []);

  const filteredDepartments = departments.filter((d) => !formData.plantId || d.plantId === formData.plantId);
  const filteredSections = sections.filter((s) => !formData.departmentId || s.departmentId === formData.departmentId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        setIsSubmitting(false);
        return;
      }
      
      const dataToSubmit: any = { ...formData };
      delete dataToSubmit.confirmPassword;
      
      // If editing and password is empty, don't send it
      if (isEditing && !dataToSubmit.password) {
        delete dataToSubmit.password;
      }
      
      
      if (!dataToSubmit.plantId) delete dataToSubmit.plantId;
      if (!dataToSubmit.departmentId) delete dataToSubmit.departmentId;
      if (!dataToSubmit.sectionId) delete dataToSubmit.sectionId;

      if (isEditing) {
        await api.put(`/users/${user.id}`, dataToSubmit);
      } else {
        await api.post("/users", dataToSubmit);
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground text-lg">{isEditing ? "Edit User" : "Add User"}</h3>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive text-sm text-destructive flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>{error}</span>
            </div>
          )}

          <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <input
                required
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Employee ID</label>
              <input
                required
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Password {isEditing && <span className="text-muted-foreground font-normal">(Leave blank to keep current)</span>}
              </label>
              <input
                required={!isEditing}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <input
                required={!isEditing || !!formData.password}
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Account Status</label>
              <select
                value={formData.isActive ? "true" : "false"}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value, plantId: "", departmentId: "", sectionId: "" })}
                className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
              >
                {allowedRoles.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {formData.role !== "SUPER_ADMIN" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Plant {formData.role === "ADMIN" && <span className="text-muted-foreground font-normal">(Optional for global Admin)</span>}
                </label>
                <select
                  required={["PLANT_ADMIN", "DEPARTMENT_HEAD", "SECTION_HEAD", "EMPLOYEE", "VIEWER"].includes(formData.role)}
                  value={formData.plantId}
                  onChange={(e) => setFormData({ ...formData, plantId: e.target.value, departmentId: "", sectionId: "" })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
                >
                  <option value="">Select Plant...</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {["DEPARTMENT_HEAD", "SECTION_HEAD", "EMPLOYEE", "VIEWER"].includes(formData.role) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Department</label>
                <select
                  required={formData.role === "DEPARTMENT_HEAD" || formData.role === "SECTION_HEAD" || formData.role === "EMPLOYEE" || formData.role === "VIEWER"}
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, sectionId: "" })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
                  disabled={!formData.plantId && plants.length > 0}
                >
                  <option value="">Select Department...</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {["SECTION_HEAD", "EMPLOYEE", "VIEWER"].includes(formData.role) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Section {formData.role !== "SECTION_HEAD" && <span className="text-muted-foreground font-normal">(Optional)</span>}</label>
                <select
                  required={formData.role === "SECTION_HEAD"}
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm"
                  disabled={!formData.departmentId && departments.length > 0}
                >
                  <option value="">Select Section...</option>
                  {filteredSections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </form>
        </div>

        <div className="p-4 border-t border-border flex gap-2 justify-end bg-muted/20">
          <Button type="button" onClick={onClose} className="bg-transparent hover:bg-muted text-foreground border border-border">
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-form"
            disabled={isSubmitting}
            className="bg-[var(--brand)] hover:opacity-90 text-white"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
