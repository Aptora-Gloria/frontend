// src/app/AppLayout.tsx
"use client"; // Next.js App Router'da useState kullanmak için bu ŞART

import { ReactNode, useState } from "react";
import Sidebar from "@/shared/components/Sidebar";
import SettingsModal from "@/shared/components/SettingsModal";

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    // Modalın açık/kapalı durumunu tutan state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

            <div className="ml-[260px]">
                {children}
            </div>
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
}