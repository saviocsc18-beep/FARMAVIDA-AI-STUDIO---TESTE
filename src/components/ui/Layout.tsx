import React, { ElementType } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, LucideIcon } from "lucide-react";
import { cn } from "../../lib/ui";

function renderLayoutIcon(
  iconProp: React.ReactNode | ElementType | undefined,
  defaultClasses = "w-5 h-5"
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

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "muted" | "highlight" | "danger" | "warn";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-white border-[#E1E9E4] text-[#13231B] shadow-xs",
      muted: "bg-[#F3F7F4] border-[#E1E9E4] text-[#13231B]",
      highlight: "bg-[#E6F4EC] border-[#C2E4D2] text-[#0B6445]",
      danger: "bg-[#FDEDEB] border-[#F8B5AF] text-[#A8261B]",
      warn: "bg-[#FFF4E0] border-[#FFE1A8] text-[#8A5300]",
    };

    const paddingStyles = {
      none: "p-0",
      sm: "p-3 sm:p-4",
      md: "p-4 sm:p-5",
      lg: "p-5 sm:p-6",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[16px] border transition-all duration-150",
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode | ElementType;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  action,
  icon,
  className,
}) => {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4", className)}>
      <div className="flex items-center gap-2.5">
        {icon && <div className="text-[#0E7A53] flex-shrink-0">{renderLayoutIcon(icon, "w-5 h-5")}</div>}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#13231B] tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs sm:text-sm text-[#56675E]">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  actions,
  badge,
  className,
}) => {
  return (
    <header className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E1E9E4] mb-6", className)}>
      <div className="space-y-1">
        {breadcrumb && (
          <div className="text-xs font-semibold text-[#56675E] flex items-center gap-1.5">
            <span>FarmaVida</span>
            <span>/</span>
            <span className="text-[#0E7A53]">{breadcrumb}</span>
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#13231B] tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-[#56675E] max-w-3xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>}
    </header>
  );
};

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  trend?: {
    value: string | number;
    positive?: boolean;
    label?: string;
  };
  variant?: "default" | "brand" | "warn" | "danger";
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
  onClick,
}) => {
  const iconVariants = {
    default: "bg-[#F3F7F4] text-[#0E7A53]",
    brand: "bg-[#E6F4EC] text-[#0E7A53]",
    warn: "bg-[#FFF4E0] text-[#8A5300]",
    danger: "bg-[#FDEDEB] text-[#B42318]",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-[16px] border border-[#E1E9E4] p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all",
        onClick ? "cursor-pointer hover:border-[#0E7A53] hover:shadow-sm active:scale-[0.99]" : "",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs sm:text-sm font-semibold text-[#56675E]">{title}</span>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconVariants[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold text-[#13231B] tracking-tight tabular">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1 text-xs text-[#56675E] flex-wrap">
            {trend && (
              <span
                className={cn(
                  "font-bold tabular px-1.5 py-0.5 rounded",
                  trend.positive ? "bg-[#E6F4EC] text-[#0B6445]" : "bg-[#FDEDEB] text-[#B42318]"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}
              </span>
            )}
            {trend?.label && <span>{trend.label}</span>}
            {subtitle && !trend && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  action,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[16px] border border-dashed border-[#CFDAD3] bg-[#F3F7F4]/50", className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E1E9E4] flex items-center justify-center text-[#56675E] mb-3 shadow-xs">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-bold text-[#13231B]">{title}</h3>
      {description && <p className="text-xs sm:text-sm text-[#56675E] max-w-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rect" | "circle";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rect",
  width,
  height,
  style,
  ...props
}) => {
  const variantStyles = {
    text: "h-4 rounded-md",
    rect: "rounded-[12px]",
    circle: "rounded-full",
  };

  return (
    <div
      className={cn("bg-[#E1E9E4] animate-pulse", variantStyles[variant], className)}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      {...props}
    />
  );
};

export interface CalloutProps {
  title?: string;
  variant?: "info" | "warn" | "danger" | "ok";
  icon?: React.ReactNode | ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Callout: React.FC<CalloutProps> = ({
  title,
  variant = "info",
  icon,
  children,
  action,
  className,
}) => {
  const variantStyles = {
    info: "bg-[#E9F2FB] text-[#0C4074] border-[#BEDAF5]",
    warn: "bg-[#FFF4E0] text-[#8A5300] border-[#FFE1A8]",
    danger: "bg-[#FDEDEB] text-[#A8261B] border-[#F8B5AF]",
    ok: "bg-[#E6F4EC] text-[#0B6445] border-[#C2E4D2]",
  };

  const defaultIcons = {
    info: <Info className="w-5 h-5 text-[#1B5C99] shrink-0" />,
    warn: <AlertTriangle className="w-5 h-5 text-[#D98A0B] shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-[#B42318] shrink-0" />,
    ok: <CheckCircle2 className="w-5 h-5 text-[#0E7A53] shrink-0" />,
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3.5 sm:p-4 rounded-[12px] border text-xs sm:text-sm",
        variantStyles[variant],
        className
      )}
    >
      {icon ? renderLayoutIcon(icon, "w-5 h-5 shrink-0") : defaultIcons[variant]}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-bold text-sm mb-0.5">{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
