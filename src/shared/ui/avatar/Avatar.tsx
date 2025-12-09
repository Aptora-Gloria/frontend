import React from "react";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
    name: string;
    size?: AvatarSize;
    className?: string;
}

/**
 * Generates initials from a name string.
 * Example: "Tahir Burak Avar" → "TB"
 */
function getInitials(name: string): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+|_/).filter(Boolean);

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    const first = parts[0]?.charAt(0).toUpperCase() ?? "";
    const last = parts[1]?.charAt(0).toUpperCase() ?? "";

    return `${first}${last}`;
}

/**
 * Avatar component (initials-based)
 */
export const Avatar: React.FC<AvatarProps> = ({
    name,
    size = "md",
    className = "",
}) => {
    const initials = getInitials(name);

    const sizeClass =
        size === "sm"
            ? "h-7 w-7 text-xs"
            : size === "lg"
                ? "h-12 w-12 text-lg"
                : "h-9 w-9 text-sm"; // md

    const base =
        "grid place-items-center rounded-full bg-slate-200 font-semibold text-slate-700";

    return (
        <div className={`${base} ${sizeClass} ${className}`}>
            {initials}
        </div>
    );
};

export default Avatar;
