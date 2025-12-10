import React from "react";

export type ButtonVariant = "primary" | "secondary" | "outline";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    fullWidth?: boolean;
}

/**
 * Normal button component
 */
export const Button: React.FC<ButtonProps> = ({
    variant = "primary",
    fullWidth,
    className = "",
    children,
    ...rest
}) => {
    const base =
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none";

    const variantClass =
        variant === "primary"
            ? "bg-slate-900 text-white hover:bg-slate-800"
            : variant === "secondary"
                ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                : "border border-slate-300 text-slate-800 hover:bg-slate-50";

    const widthClass = fullWidth ? "w-full" : "";

    const finalClass = `${base} ${variantClass} ${widthClass} ${className}`;

    return (
        <button className={finalClass} {...rest}>
            {children}
        </button>
    );
};

export default Button;
