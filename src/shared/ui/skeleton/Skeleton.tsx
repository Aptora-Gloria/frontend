import React from "react";

export type SkeletonVariant = "text" | "card" | "list";

export interface SkeletonProps {
    variant?: SkeletonVariant;
    lines?: number;      // list için kaç satır
    className?: string;
}

/**
 * Universal Skeleton Loader
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    variant = "text",
    lines = 3,
    className = "",
}) => {
    if (variant === "text") {
        return (
            <div
                className={`
          h-4 w-full animate-pulse rounded bg-slate-200 
          ${className}
        `}
            />
        );
    }

    if (variant === "card") {
        return (
            <div
                className={`
          h-32 w-full animate-pulse rounded-2xl bg-slate-200 
          ${className}
        `}
            />
        );
    }

    if (variant === "list") {
        return (
            <div className={`space-y-3 ${className}`}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div key={i} className="h-4 w-full animate-pulse rounded bg-slate-200" />
                ))}
            </div>
        );
    }

    return null;
};

export default Skeleton;
