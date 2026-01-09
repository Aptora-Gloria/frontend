// src/app/AppLayout.tsx
"use client"; // Next.js App Router'da useState kullanmak için bu ŞART

import { ReactNode, useState } from "react";
import Sidebar from "@/shared/components/Sidebar";

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    // Modalın açık/kapalı durumunu tutan state


    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />

            <div className="ml-[260px]">
                {children}
            </div>
           
        </div>
    );
}