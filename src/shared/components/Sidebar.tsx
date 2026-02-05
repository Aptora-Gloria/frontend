import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutGrid,
    GitBranch,
    Building2,
    User,
    LogOut,
    Activity // <--- YENİ İKON EKLENDİ
} from "lucide-react";
import { useAuth } from "@/shared/contexts/AuthContext";

// --- NAVIGASYON LİSTESİ GÜNCELLENDİ ---
const navItems = [
    { key: "Dashboard", icon: LayoutGrid, to: "/dashboard" },
    { key: "Repositories", icon: GitBranch, to: "/repositories" },
    { key: "Performance", icon: Activity, to: "/user-performance" }, // <--- YENİ MENÜ
    { key: "Profile", icon: User, to: "/profile" },
];

interface SidebarProps {
    onOpenSettings?: () => void;
}

export default function Sidebar({ onOpenSettings }: SidebarProps) {
    const navigate = useNavigate();
    const { logout, user } = useAuth();

    /** Safe logout */
    const handleLogout = () => {
        logout();
        setTimeout(() => navigate("/", { replace: true }), 0);
    };

    return (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-100 bg-white text-slate-600">

            {/* --- MARKA ALANI --- */}
            <div className="flex h-20 items-center px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="h-4 w-4 rounded-full border-[2.5px] border-slate-900" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                            Optimetric
                        </span>
                    </div>
                </div>
            </div>

            {/* --- NAVİGASYON --- */}
            <nav className="flex-1 space-y-1 px-4 py-4">
                {navItems.map(({ key, icon: Icon, to }) => (
                    <NavLink
                        key={key}
                        to={to}
                        end={to === "/dashboard"}
                        className={({ isActive }) =>
                            `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-slate-100 text-slate-900 shadow-sm"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                                        }`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span>{key}</span>
                            </>
                        )}
                    </NavLink>
                ))}

              
            </nav>

            {/* --- ALT KISIM: PROFİL & LOGOUT --- */}
            <div className="border-t border-slate-100 p-4">

                {/* Profil Bilgisi */}
                <div className="mb-4 flex items-center gap-3 px-1">
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt="User"
                            className="h-11 w-11 rounded-full border border-slate-200 bg-slate-50 object-cover"
                        />
                    ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-sm font-bold text-slate-600">
                            {user?.name?.[0] || "U"}
                        </div>
                    )}

                    <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-semibold text-slate-900">
                            {user?.name || "User Name"}
                        </span>
                        <span className="truncate text-xs text-slate-500 font-medium">
                            @{user?.login || "userlogin"}
                        </span>
                    </div>
                </div>

                {/* Logout Butonu */}
                <button
                    onClick={handleLogout}
                    className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-500 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-red-600 hover:shadow-sm"
                >
                    <LogOut className="h-[18px] w-[18px] text-slate-400 transition-colors group-hover:text-red-500" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}