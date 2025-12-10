import React, { useEffect, useState } from 'react';
import {
    X, User, Bell, Shield, Monitor, Mail, Smartphone, CheckCircle, ChevronRight
} from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'general' | 'profile' | 'notifications' | 'security';

// --- ALT BİLEŞENLER (PERFORMANS İÇİN AYRILDI) ---

const GeneralTab = () => (
    <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        <section>
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Appearance</h4>
            <div className="grid grid-cols-3 gap-4">
                {[
                    { name: 'Light', bg: 'bg-white', border: 'border-slate-200' },
                    { name: 'Dark', bg: 'bg-slate-900', border: 'border-slate-700' },
                    { name: 'Auto', bg: 'bg-gradient-to-br from-white to-slate-800', border: 'border-slate-200' }
                ].map((theme) => (
                    <button key={theme.name} className="group relative flex flex-col items-start gap-3 rounded-xl border border-slate-200 p-3 hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-left">
                        <div className={`h-20 w-full rounded-lg shadow-sm ${theme.bg} ${theme.border} border`}>
                            <div className="mt-2 ml-2 h-2 w-12 rounded-full bg-slate-200/50"></div>
                            <div className="mt-2 ml-2 h-2 w-8 rounded-full bg-slate-200/50"></div>
                        </div>
                        <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-medium text-slate-700">{theme.name}</span>
                            {theme.name === 'Light' && <CheckCircle size={16} className="text-blue-600" />}
                        </div>
                    </button>
                ))}
            </div>
        </section>

        <section>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Language & Region</h4>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Display Language</label>
                    <select className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-700 focus:border-blue-500 focus:ring-blue-500 outline-none transition-shadow">
                        <option>English (United States)</option>
                        <option>Türkçe</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Time Zone</label>
                    <select className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-700 focus:border-blue-500 focus:ring-blue-500 outline-none transition-shadow">
                        <option>(GMT+03:00) Istanbul</option>
                        <option>(GMT-08:00) Pacific Time</option>
                    </select>
                </div>
            </div>
        </section>
    </div>
);

const ProfileTab = () => (
    <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-start gap-6 pb-6 border-b border-slate-100">
            <div className="group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full ring-4 ring-slate-50">
                <img src="https://ui-avatars.com/api/?name=Gloria+R&background=0D8ABC&color=fff&size=128" alt="Profile" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-xs font-medium text-white">Edit</span>
                </div>
            </div>
            <div className="pt-2">
                <h4 className="text-lg font-bold text-slate-900">Gloria Riviera</h4>
                <p className="text-sm text-slate-500 mb-3">Product Designer at Optimetric</p>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                    Upload new picture
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">First Name</label>
                <input type="text" defaultValue="Gloria" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Name</label>
                <input type="text" defaultValue="Riviera" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
            </div>
            <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="email" defaultValue="gloria@optimetric.com" className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
            </div>
            <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bio</label>
                <textarea rows={3} defaultValue="Designing intuitive interfaces for complex data." className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
            </div>
        </div>
    </div>
);

const NotificationsTab = () => (
    <div className="space-y-4 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        {[
            { title: 'Marketing Emails', desc: 'Receive emails about new products, features, and more.', icon: Mail },
            { title: 'Security Alerts', desc: 'Get notified about important security alerts and login attempts.', icon: Shield },
            { title: 'Mobile Push', desc: 'Receive push notifications on your mobile devices.', icon: Smartphone },
        ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50 hover:border-slate-200">
                <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm">
                        <item.icon size={18} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-500 max-w-[280px]">{item.desc}</p>
                    </div>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={idx !== 0} />
                    <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
            </div>
        ))}
    </div>
);

const SecurityTab = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="mb-6 rounded-full bg-green-100 p-4">
            <Shield className="h-10 w-10 text-green-600" />
        </div>
        <h4 className="text-xl font-bold text-slate-900">Account is Secure</h4>
        <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
            Your password was last changed 3 months ago. 2-Factor Authentication is enabled.
        </p>
        <div className="mt-8 flex gap-3">
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                View Activity Log
            </button>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95">
                Change Password
            </button>
        </div>
    </div>
);


export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('general');

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    // Menü Butonu
    const TabButton = ({ id, icon: Icon, label }: { id: TabType, icon: any, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 
            ${activeTab === id
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
                }`}
        >
            <Icon size={18} className={`transition-colors ${activeTab === id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
            {label}
            {activeTab === id && <ChevronRight size={14} className="ml-auto text-blue-400" />}
        </button>
    );

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ease-out
            ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            style={{ backdropFilter: 'blur(2px)' }} // Blur azaltıldı (Performans için)
        >
            <div className="absolute inset-0 bg-slate-900/40 transition-opacity" onClick={onClose} />

            <div
                className={`
                    will-change-transform relative flex h-[600px] w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-black/5 transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1)
                    ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* --- SIDEBAR --- */}
                <div className="w-64 flex flex-col border-r border-slate-200/60 bg-slate-100/50 p-5">
                    <div className="mb-8 pl-2">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Settings</h2>
                        <p className="text-xs text-slate-500">Manage your preferences</p>
                    </div>

                    <nav className="space-y-1.5 flex-1">
                        <TabButton id="general" icon={Monitor} label="General" />
                        <TabButton id="profile" icon={User} label="My Profile" />
                        <TabButton id="notifications" icon={Bell} label="Notifications" />
                        <TabButton id="security" icon={Shield} label="Security" />
                    </nav>
                </div>

                {/* --- CONTENT AREA (OPTIMIZED) --- */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                        <h3 className="text-lg font-bold text-slate-800 capitalize">
                            {activeTab === 'general' ? 'General Preferences' :
                                activeTab === 'profile' ? 'Profile Details' :
                                    activeTab === 'notifications' ? 'Notification Settings' : 'Security & Login'}
                        </h3>
                        <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* BURASI KRİTİK NOKTA:
                        Hepsini render ediyoruz ama sadece seçili olanı gösteriyoruz (display: block/none).
                        React DOM'u silip tekrar yapmadığı için geçiş milisaniyelik olur.
                    */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">

                        <div className={activeTab === 'general' ? 'block' : 'hidden'}>
                            <GeneralTab />
                        </div>

                        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
                            <ProfileTab />
                        </div>

                        <div className={activeTab === 'notifications' ? 'block' : 'hidden'}>
                            <NotificationsTab />
                        </div>

                        <div className={activeTab === 'security' ? 'block' : 'hidden'}>
                            <SecurityTab />
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 p-5 flex justify-end gap-3 bg-slate-50/50">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                            Cancel
                        </button>
                        <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-lg shadow-slate-200 transition-all active:scale-95">
                            Save Changes
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}