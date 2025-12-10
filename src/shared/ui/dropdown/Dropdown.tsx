import {
    useState,
    useRef,
    useEffect,
    useCallback,
    type KeyboardEvent,
    type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";

export type DropdownItem = {
    label: string;
    value: string;
    icon?: ReactNode;
};

type DropdownProps = {
    label: string;
    items: DropdownItem[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    widthClass?: string;
    icon?: ReactNode;
};

/**
 * Accessible dropdown component with keyboard navigation.
 * Supports ArrowUp/Down, Enter (select), Escape (close) and outside click close.
 */
export function Dropdown({
    label,
    items,
    value,
    onChange,
    placeholder = "Select",
    className = "",
    widthClass = "w-56",
    icon,
}: DropdownProps) {
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState<number>(-1);
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const selected = items.find((i) => i.value === value);

    // Close when clicking outside
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                btnRef.current &&
                menuRef.current &&
                !btnRef.current.contains(e.target as Node) &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
                setHighlighted(-1);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLButtonElement>) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (!open) {
                    setOpen(true);
                    setHighlighted(0);
                    return;
                }
                setHighlighted((prev) => {
                    const next =
                        e.key === "ArrowDown"
                            ? (prev + 1) % items.length
                            : (prev - 1 + items.length) % items.length;
                    return next;
                });
            } else if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!open) {
                    setOpen(true);
                    setHighlighted(0);
                    return;
                }
                if (highlighted >= 0) {
                    onChange(items[highlighted].value);
                    setOpen(false);
                    setHighlighted(-1);
                }
            } else if (e.key === "Escape") {
                setOpen(false);
                setHighlighted(-1);
                btnRef.current?.focus();
            }
        },
        [open, highlighted, items, onChange],
    );

    return (
        <div className={`relative flex flex-col ${widthClass} ${className}`}>
            <span className="mb-1 text-sm text-slate-700">{label}</span>

            <button
                ref={btnRef}
                type="button"
                onClick={() => {
                    setOpen((o) => !o);
                    setHighlighted(0);
                }}
                onKeyDown={handleKeyDown}
                className="
          flex w-full items-center justify-between
          rounded-full border border-slate-300 bg-white
          px-4 py-1.5 text-sm text-slate-700
          overflow-hidden whitespace-nowrap text-ellipsis
          hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200
        "
            >
                <span className="flex min-w-0 items-center gap-2">
                    {icon && <span className="text-slate-500">{icon}</span>}
                    <span className="truncate">{selected?.label ?? placeholder}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
            </button>

            {open && (
                <div
                    ref={menuRef}
                    className="
            absolute left-0 top-full z-20 mt-2
            w-full rounded-xl border border-slate-200 bg-white shadow
            max-h-60 overflow-auto
          "
                >
                    {items.map((item, idx) => {
                        const isActive = item.value === value;
                        const isHighlighted = idx === highlighted;
                        return (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                    onChange(item.value);
                                    setOpen(false);
                                    setHighlighted(-1);
                                    btnRef.current?.focus();
                                }}
                                className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                                    isHighlighted
                                        ? "bg-slate-100"
                                        : isActive
                                            ? "bg-slate-50 text-slate-900"
                                            : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {item.icon && <span className="text-slate-500">{item.icon}</span>}
                                <span className="truncate">{item.label}</span>
                                {isActive && (
                                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
