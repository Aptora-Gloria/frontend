import React from "react";

export type PillButtonVariant = "primary" | "secondary" | "outline";

export type PillButtonProps =
    | ({
        as?: "button";
        variant?: PillButtonVariant;
    } & React.ButtonHTMLAttributes<HTMLButtonElement>)
    | ({
        as: "a";
        variant?: PillButtonVariant;
    } & React.AnchorHTMLAttributes<HTMLAnchorElement>);

    
export const PillButton: React.FC<PillButtonProps> = ({
    as = "button",
    variant = "secondary",
    className = "",
    children,
    ...rest
}) => {
    const base =
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition shadow-sm";
    const variantClass =
        variant === "primary"
            ? "bg-slate-900 text-white hover:bg-slate-800"
            : variant === "secondary"
                ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50";

    const finalClass = `${base} ${variantClass} ${className}`;

    if (as === "a") {
        return (
            <a className={finalClass} {...(rest as any)}>
                {children}
            </a>
        );
    }

    return (
        <button className={finalClass} {...(rest as any)}>
            {children}
        </button>
    );
};

export default PillButton;
