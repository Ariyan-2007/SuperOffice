import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, disabled, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={clsx("btn", `btn-${variant}`, size === "sm" && "btn-sm", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 size={14} className="spin" style={{ animation: "spin 0.7s linear infinite" }} />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
