import type { ReactNode } from "react";

export interface DropdownItemProps {
    label: string;
    value: string;
    icon?: ReactNode;
    active?: boolean;
    onClick: (value: string) => void;
}

export const DropdownItem = ({
    label,
    value,
    icon,
    active,
    onClick,
}: DropdownItemProps) => {
    return (
        <button
            type="button"
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm 
        ${active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}
            onClick={() => onClick(value)}
        >
            {icon}
            <span>{label}</span>
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-500" />}
        </button>
    );
};
