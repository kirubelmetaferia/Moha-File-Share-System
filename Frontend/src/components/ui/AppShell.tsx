import { type ReactNode, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FolderOpen, Users, Building2, Network, Share2, Sun, Moon, Menu, X, LogOut, Settings as SettingsIcon, Trash2 } from "lucide-react";
import logo from "@/assets/logo.png";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", roles: null, icon: LayoutDashboard },
  { path: "/files", label: "Files", roles: null, icon: FolderOpen },
  { path: "/shares", label: "Shares", roles: null, icon: Share2 },
  { path: "/recycle-bin", label: "Recycle Bin", roles: null, icon: Trash2 },
  { path: "/reports", label: "Reports", roles: ["SUPER_ADMIN", "PLANT_ADMIN"], icon: LayoutDashboard },
  { path: "/users", label: "Users", roles: ["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN", "DEPARTMENT_HEAD", "SECTION_HEAD"], icon: Users },
  { path: "/plants", label: "Plants", roles: ["SUPER_ADMIN", "ADMIN"], icon: Building2 },
  { path: "/departments", label: "Departments", roles: ["SUPER_ADMIN", "ADMIN", "PLANT_ADMIN"], icon: Network },
  { path: "/settings", label: "Settings", roles: ["SUPER_ADMIN"], icon: SettingsIcon },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  PLANT_ADMIN: "Plant Admin",
  DEPARTMENT_HEAD: "Department Head",
  SECTION_HEAD: "Section Head",
  EMPLOYEE: "Employee",
  VIEWER: "Viewer",
};

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role ?? "")
  );

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
        <img src={logo} alt="MOHA" className="h-8 shrink-0 mr-3" />
        <span className="font-bold text-sm leading-tight text-foreground line-clamp-2">MOHA SOFT DRINKS INDUSTRY S.C.</span>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden ml-auto text-muted-foreground">
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 border-l-2 ${isActive
                  ? "bg-brand/10 text-brand border-brand font-semibold shadow-[inset_1px_0_0_0_transparent]"
                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium"
                }`}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 border-r border-border bg-card print:hidden">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-64 flex flex-col bg-card border-r border-border">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-brand flex items-center justify-between px-4 sm:px-6 shrink-0 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-white shrink-0">
              <Menu className="size-5" />
            </button>
            <h1 className="text-white font-bold tracking-tight text-base sm:text-lg truncate">
              MOHA SOFT DRINKS INDUSTRY S.C.
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button
              onClick={toggle}
              className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 text-white border-0"
            >
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight text-white">{user?.fullName}</p>
              <p className="text-xs text-white/70 leading-tight">
                {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {initials(user?.fullName)}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}