import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, FileSpreadsheet, Download, KeyRound } from "lucide-react";
import UserModal, { type User } from "@/components/users/UserModal";
import ImportUsersModal from "@/components/users/ImportUsersModal";
import AdminResetPasswordModal from "@/components/users/AdminResetPasswordModal";

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-[var(--brand)]/15 text-[var(--brand)]",
  ADMIN: "bg-teal-500/10 text-teal-600",
  PLANT_ADMIN: "bg-blue-500/10 text-blue-600",
  DEPARTMENT_HEAD: "bg-purple-500/10 text-purple-600",
  SECTION_HEAD: "bg-amber-500/10 text-amber-600",
  EMPLOYEE: "bg-muted text-muted-foreground",
  VIEWER: "bg-muted text-muted-foreground",
};

interface UserWithRelations extends User {
  plant?: { name: string };
  department?: { name: string };
  section?: { name: string };
}

export default function UsersList() {
  const [users, setUsers] = useState<UserWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user: currentUser } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const canManageUsers = ["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN", "DEPARTMENT_HEAD", "SECTION_HEAD"].includes(currentUser?.role || "");

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/users?limit=1000&status=${statusFilter}`);
      setUsers(data.data.items);
      setTotal(data.data.total);
    } catch {
      setError("Couldn't load users. Try refreshing the page.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleExport = async () => {
    try {
      const response = await api.get(`/users/bulk-export?status=${statusFilter}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Failed to export users.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Failed to delete user.");
    }
  };

  const openAddModal = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setIsResetPasswordOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${total} ${total === 1 ? "person" : "people"} in your scope`}
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 py-2 border rounded-md text-sm bg-background border-input"
          >
            <option value="active">Active Users</option>
            <option value="inactive">Inactive Users</option>
            <option value="all">All Users</option>
          </select>

          {canManageUsers && (
            <div className="flex gap-2">
              <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Import Users
              </Button>
              <Button onClick={handleExport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Export Users
              </Button>
              <Button onClick={openAddModal} className="gap-2 bg-[var(--brand)] text-white hover:opacity-90">
                <Plus className="h-4 w-4" /> Add User
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4" role="alert">{error}</p>
      )}

      {isLoading && (
        <div className="border rounded-lg divide-y">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && users.length === 0 && (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm">No users found in your scope yet.</p>
        </div>
      )}

      {!isLoading && users.length > 0 && (
        <div className="border rounded-lg overflow-x-auto bg-card">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted/50 text-left border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Employee ID</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Assignment</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors duration-200 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {u.fullName}
                    {u.id === currentUser?.id && (
                      <span className="text-xs text-muted-foreground font-normal ml-1">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.employeeId}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {u.plant?.name ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{u.plant.name}</span>
                        {(u.department || u.section) && (
                          <span className="opacity-80">
                            {u.department?.name} {u.section?.name ? ` > ${u.section.name}` : ""}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="opacity-50">Global / System</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${ROLE_STYLES[u.role] ?? ""}`}>
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canManageUsers && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openResetPasswordModal(u)}
                          className="h-8 px-2 text-muted-foreground hover:text-[var(--brand)]"
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                          <span className="sr-only">Reset Password</span>
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditModal(u)}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(u.id, u.fullName)}
                        disabled={u.id === currentUser?.id}
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <UserModal 
          user={selectedUser} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            fetchUsers();
          }} 
        />
      )}

      {isImportModalOpen && (
        <ImportUsersModal
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            fetchUsers();
          }}
        />
      )}

      {isResetPasswordOpen && selectedUser && (
        <AdminResetPasswordModal
          user={selectedUser}
          onClose={() => setIsResetPasswordOpen(false)}
          onSuccess={() => {
            setIsResetPasswordOpen(false);
          }}
        />
      )}
    </div>
  );
}