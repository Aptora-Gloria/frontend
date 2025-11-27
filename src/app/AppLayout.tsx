// src/app/AppLayout.tsx
import { ReactNode } from "react";
import Sidebar from "@/shared/components/Sidebar";

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />
            <div className="ml-[260px]">
                {/* Sayfa içerikleri */}
                {children}
            </div>
        </div>
    );
}
