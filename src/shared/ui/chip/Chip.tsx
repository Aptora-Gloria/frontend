import { ReactNode } from "react";

export interface ChipProps {
    label: string;
    icon?: ReactNode;
    variant?: "default" | "outline" | "subtle";
    className?: string;
}

const Chip = ({
    label,
    icon,
    variant = "default",
    className = "",
}: ChipProps) => {
    const base =
        "inline-flex items-center gap-2 rounded-full text-sm px-3 py-1 transition";

    const variants = {
        default: "bg-white border border-slate-200 text-slate-700",
        outline: "border border-slate-300 text-slate-700 bg-transparent",
        subtle: "bg-slate-100 text-slate-600",
    };

    return (
        <span className={`${base} ${variants[variant]} ${className}`}>
            {icon && <span className="text-slate-600">{icon}</span>}
            {label}
        </span>
    );
};

export default Chip;
