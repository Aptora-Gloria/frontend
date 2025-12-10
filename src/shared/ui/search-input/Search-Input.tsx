import { Search } from "lucide-react";
import { useCallback } from "react";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);
        },
        [onChange]
    );

    return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5">
            <Search className="h-4 w-4 text-slate-500" />
            <input
                type="text"
                className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
            />
        </div>
    );
}
