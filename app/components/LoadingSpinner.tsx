interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

const sizeClasses: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-4",
};

const LoadingSpinner = ({
  size = "md",
  color = "border-blue-500",
  className = "",
}: LoadingSpinnerProps) => {
  const sizeClass = sizeClasses[size];

  return (
    <span
      role="status"
      aria-live="polite"
      className={[
        "inline-flex animate-spin rounded-full border-solid border-t-transparent",
        sizeClass,
        color,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="sr-only">Loading</span>
    </span>
  );
};

export default LoadingSpinner;
