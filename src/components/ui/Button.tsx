import React, { ElementType } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/ui";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "soft" | "danger" | "dangerSolid";
  size?: "sm" | "md" | "lg" | "xl";
  icon?: React.ReactNode | ElementType;
  iconRight?: React.ReactNode | ElementType;
  iconPosition?: "left" | "right";
  block?: boolean;
  loading?: boolean;
}

function renderButtonIcon(
  iconProp: React.ReactNode | ElementType | undefined,
  defaultClasses: string
) {
  if (!iconProp) return null;
  if (React.isValidElement(iconProp)) {
    return iconProp;
  }
  if (
    typeof iconProp === "function" ||
    (typeof iconProp === "object" && iconProp !== null && "$$typeof" in iconProp)
  ) {
    const IconComp = iconProp as ElementType;
    return <IconComp className={defaultClasses} />;
  }
  return iconProp as React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      icon,
      iconRight,
      iconPosition = "left",
      block = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Variantes de estilo com tokens FarmaVida
    const variantStyles = {
      primary:
        "bg-[#0E7A53] hover:bg-[#0A5F40] active:bg-[#07452F] text-white shadow-xs focus-visible:ring-2 focus-visible:ring-[#0E7A53] border border-transparent",
      secondary:
        "bg-white hover:bg-[#F3F7F4] text-[#13231B] border border-[#E1E9E4] hover:border-[#CFDAD3] active:bg-[#E6F4EC] shadow-xs",
      ghost:
        "bg-transparent hover:bg-[#E6F4EC] text-[#0B6445] hover:text-[#0A5F40] border border-transparent active:bg-[#C2E4D2]",
      soft:
        "bg-[#E6F4EC] hover:bg-[#C2E4D2] text-[#0B6445] border border-transparent font-bold",
      danger:
        "bg-[#FDEDEB] hover:bg-[#FBD9D5] text-[#B42318] border border-[#F8B5AF] hover:border-[#B42318]",
      dangerSolid:
        "bg-[#B42318] hover:bg-[#A8261B] text-white shadow-xs border border-transparent focus-visible:ring-2 focus-visible:ring-[#B42318]",
    };

    // Tamanhos ergonômicos (mínimo 36 no sm, 44 no md para toque de balcão)
    const sizeStyles = {
      sm: "h-9 px-3 text-xs gap-1.5 rounded-[10px]",
      md: "h-11 px-4 text-sm gap-2 rounded-[12px]",
      lg: "h-12 px-5 text-base gap-2 rounded-[12px]",
      xl: "h-14 px-6 text-base font-bold gap-2.5 rounded-[14px]",
    };

    const iconSizeClasses = {
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
      xl: "w-5 h-5",
    };

    const isIconOnly = !children && (icon || iconRight);

    const effectiveLeftIcon =
      iconPosition === "left" ? icon : !iconRight ? undefined : icon;
    const effectiveRightIcon =
      iconPosition === "right" && !iconRight ? icon : iconRight;

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-bold transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          block ? "w-full" : "",
          isIconOnly ? "px-0 aspect-square" : "",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn("animate-spin text-current", iconSizeClasses[size])} />
        ) : (
          effectiveLeftIcon && (
            <span className="inline-flex shrink-0 items-center justify-center">
              {renderButtonIcon(effectiveLeftIcon, iconSizeClasses[size])}
            </span>
          )
        )}
        {children && <span>{children}</span>}
        {!loading && effectiveRightIcon && (
          <span className="inline-flex shrink-0 items-center justify-center">
            {renderButtonIcon(effectiveRightIcon, iconSizeClasses[size])}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
