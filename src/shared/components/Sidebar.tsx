// src/shared/components/Sidebar.tsx
import { NavLink } from "react-router-dom";
import {
    LayoutGrid,
    GitBranch,
    Building2,
    User,
    Settings,
} from "lucide-react";

const navItems = [
    { key: "Dashboard", icon: LayoutGrid, to: "/dashboard" },
    { key: "Repositories", icon: GitBranch, to: "/repositories" },
    { key: "Organizations", icon: Building2, to: "/organizations" }, // şimdilik placeholder
    { key: "Profile", icon: User, to: "/profile" },
    { key: "Settings", icon: Settings, to: "/settings" }, // şimdilik placeholder
];

export default function Sidebar() {
    return (
        <aside className="fixed inset-y-0 left-0 z-40 w-[260px] border-r border-slate-200 bg-white/80 backdrop-blur">
            {/* Brand row */}
            <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
                <div className="h-6 w-6 rounded-full border-4 border-slate-300" />
                <span className="font-semibold text-slate-800">Optimeric</span>
            </div>

            {/* Menu */}
            <nav className="p-3">
                {navItems.map(({ key, icon: Icon, to }) => (
                    <NavLink
                        key={key}
                        to={to}
                        end={to === "/dashboard"}
                        className={({ isActive }) =>
                            [
                                "group relative mb-1 flex h-9 items-center overflow-hidden rounded-xl px-3 text-sm transition",
                                isActive ? "bg-slate-100" : "hover:bg-slate-100",
                            ].join(" ")
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full transition ${isActive
                                            ? "bg-sky-400 opacity-100"
                                            : "bg-sky-300 opacity-0 group-hover:opacity-100"
                                        }`}
                                />
                                <Icon className="mr-3 h-4 w-4 text-slate-500 group-hover:text-slate-700" />
                                <span
                                    className={`truncate ${isActive
                                            ? "font-medium text-slate-800"
                                            : "text-slate-700"
                                        }`}
                                >
                                    {key}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
