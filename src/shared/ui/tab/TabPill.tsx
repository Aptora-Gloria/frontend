export interface TabPillProps {
    label: string;
    active?: boolean;
    onClick?: () => void;
}

export default function TabPill({ label, active, onClick }: TabPillProps) {
    return (
        <button
            onClick={onClick}
            className={
                "rounded-full px-3 py-1 text-xs transition " +
                (active
                    ? "bg-slate-900/5 text-slate-900 ring-1 ring-slate-300"
                    : "text-slate-500 hover:bg-slate-50")
            }
        >
            {label}
        </button>
    );
}
