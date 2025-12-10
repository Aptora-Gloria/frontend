interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg" | number;
}

const mapSize = (size: LoadingSpinnerProps["size"]) => {
    if (typeof size === "number") return size;
    if (size === "sm") return 14;
    if (size === "md") return 20;
    if (size === "lg") return 28;
    return 20;
};

export default function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
    const pixel = mapSize(size);

    return (
        <div
            className="animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
            style={{ width: pixel, height: pixel }}
        />
    );
}
