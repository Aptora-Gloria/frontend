interface ChipDotProps {
    label: string;
    dotColor?: string; // default renk verilecek
}

export function ChipDot({ label, dotColor = "#94a3b8" }: ChipDotProps) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: dotColor }}
            ></span>
            {label}
        </span>
    );
}
