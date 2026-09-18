import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function UserPermissions() {
  const [permissions, setPermissions] = useState({
    view: false,
    create: false,
    edit: false,
    share: false,
    fullControl: false,
  });

  const handleCheckboxChange = (name: keyof typeof permissions, checked: boolean) => {
    if (name === "fullControl") {
      setPermissions((prev) => ({
        ...prev,
        fullControl: checked,
        view: checked ? true : prev.view,
        create: checked ? true : prev.create,
        edit: checked ? true : prev.edit,
        share: checked ? true : prev.share,
      }));
    } else {
      setPermissions((prev) => ({
        ...prev,
        [name]: checked,
      }));
    }
  };

  const handleSave = () => {
    console.log("Saved permissions:", permissions);
    // Add logic to save permissions here
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-foreground text-lg">Permissions</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage access controls and roles for this user.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {[
              { id: "fullControl", label: "Full Control", description: "Grants all access and permissions." },
              { id: "view", label: "View", description: "Can view files and folders." },
              { id: "create", label: "Create", description: "Can upload and create new files." },
              { id: "edit", label: "Edit", description: "Can modify existing files and properties." },
              { id: "share", label: "Share", description: "Can share files with other users." },
            ].map((perm) => (
              <div
                key={perm.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  permissions[perm.id as keyof typeof permissions]
                    ? "bg-teal-500/10 border-teal-500/30"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    id={perm.id}
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-teal-600 focus:ring-teal-500 disabled:opacity-50 cursor-pointer accent-teal-600"
                    checked={permissions[perm.id as keyof typeof permissions]}
                    disabled={perm.id !== "fullControl" && permissions.fullControl}
                    onChange={(e) =>
                      handleCheckboxChange(perm.id as keyof typeof permissions, e.target.checked)
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor={perm.id}
                    className={`text-sm font-medium leading-none cursor-pointer ${
                      perm.id !== "fullControl" && permissions.fullControl ? "opacity-50" : "text-foreground"
                    }`}
                  >
                    {perm.label}
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {perm.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end bg-muted/20">
          <Button
            onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto px-6 shadow-sm"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
