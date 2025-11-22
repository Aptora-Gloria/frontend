// src/app/AppLayout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "@/shared/components/Sidebar";

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />
            <div className="ml-[260px]">
                {/* Sayfa içerikleri */}
                <Outlet />
            </div>
        </div>
    );
}
