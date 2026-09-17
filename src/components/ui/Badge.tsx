import React, { ElementType } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn, daysUntil } from "../../lib/ui";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "ok" | "warn" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  icon?: React.ReactNode | ElementType;
}

function renderBadgeIcon(iconProp: React.ReactNode | ElementType | undefined, defaultClasses = "w-3 h-3") {
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

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  size = "md",
  icon,
  children,
  ...props
}) => {
  const variantStyles = {
    ok: "bg-[#E6F4EC] text-[#0B6445] border-[#C2E4D2]",
    warn: "bg-[#FFF4E0] text-[#8A5300] border-[#FFE1A8]",
    danger: "bg-[#FDEDEB] text-[#A8261B] border-[#F8B5AF]",
    info: "bg-[#E9F2FB] text-[#0C4074] border-[#BEDAF5]",
    neutral: "bg-[#F3F7F4] text-[#56675E] border-[#E1E9E4]",
  };

  const sizeStyles = {
    sm: "text-xs px-2 py-0.5 gap-1 rounded-md",
    md: "text-xs font-bold px-2.5 py-1 gap-1.5 rounded-lg",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold border whitespace-nowrap select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && (
        <span className="inline-flex shrink-0 items-center">
          {renderBadgeIcon(icon, size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};

export interface TarjaBadgeProps {
  tarja?: "livre" | "vermelha" | "preta" | "amarela" | string | null;
  stripe?: "red" | "black" | "yellow" | "none" | string | null;
  controlled?: boolean;
  isGeneric?: boolean;
  className?: string;
}

export const TarjaBadge: React.FC<TarjaBadgeProps> = ({
  tarja,
  stripe,
  controlled,
  isGeneric,
  className,
}) => {
  const normalized = (tarja || "").toLowerCase();
  const isBlack =
    stripe === "black" ||
    stripe === "preta" ||
    controlled === true ||
    normalized.includes("preta") ||
    normalized.includes("controlad");

  if (isBlack) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-[#13231B] text-white rounded-md uppercase tracking-wider",
          className
        )}
      >
        <ShieldAlert className="w-3 h-3 text-red-400" />
        Tarja Preta
      </span>
    );
  }

  const isRed =
    stripe === "red" ||
    stripe === "vermelha" ||
    normalized.includes("vermelha");

  if (isRed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-[#FDEDEB] text-[#B42318] border border-[#F8B5AF] rounded-md uppercase tracking-wider",
          className
        )}
      >
        <AlertCircle className="w-3 h-3 text-[#B42318]" />
        Tarja Vermelha
      </span>
    );
  }

  if (isGeneric || stripe === "yellow" || normalized.includes("amarela") || normalized.includes("genérico")) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-[#FFF4E0] text-[#8A5300] border border-[#FFE1A8] rounded-md uppercase tracking-wider",
          className
        )}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-[#D98A0B] text-white text-[9px] flex items-center justify-center font-black">G</span>
        Genérico (G)
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-[#E6F4EC] text-[#0B6445] border border-[#C2E4D2] rounded-md",
        className
      )}
    >
      <CheckCircle2 className="w-3 h-3 text-[#0E7A53]" />
      Venda Livre (MIP)
    </span>
  );
};

export interface ExpiryBadgeProps {
  daysRemaining?: number;
  expiryDate?: string;
  date?: string;
  className?: string;
}

export const ExpiryBadge: React.FC<ExpiryBadgeProps> = ({
  daysRemaining,
  expiryDate,
  date,
  className,
}) => {
  const targetDate = date || expiryDate;
  const days = daysRemaining !== undefined ? daysRemaining : targetDate ? daysUntil(targetDate) : 999;

  if (days <= 0) {
    return (
      <Badge variant="danger" icon={<AlertCircle className="w-3 h-3" />} className={className}>
        Vencido {targetDate ? `(${targetDate})` : ""}
      </Badge>
    );
  }

  if (days <= 30) {
    return (
      <Badge variant="danger" icon={<AlertCircle className="w-3 h-3" />} className={className}>
        {days}d para vencer
      </Badge>
    );
  }

  if (days <= 90) {
    return (
      <Badge variant="warn" icon={<AlertTriangle className="w-3 h-3" />} className={className}>
        {days}d para vencer
      </Badge>
    );
  }

  return (
    <Badge variant="ok" className={className}>
      Válido {targetDate ? `(${targetDate})` : ""}
    </Badge>
  );
};

export interface StockLevelProps {
  current: number;
  min: number;
  max?: number;
  unit?: string;
  className?: string;
}

export const StockLevel: React.FC<StockLevelProps> = ({
  current,
  min,
  max,
  unit = "un",
  className,
}) => {
  const isCritical = current <= min * 0.5;
  const isLow = current <= min;
  const denominator = max ? Math.max(max, current, 1) : Math.max(min * 2.5, current, 1);
  const percentage = Math.min(100, Math.round((current / denominator) * 100));

  let barColor = "bg-[#0E7A53]";
  let textColor = "text-[#0B6445]";

  if (isCritical) {
    barColor = "bg-[#B42318]";
    textColor = "text-[#A8261B]";
  } else if (isLow) {
    barColor = "bg-[#D98A0B]";
    textColor = "text-[#8A5300]";
  }

  return (
    <div className={cn("flex flex-col gap-1 min-w-[90px]", className)}>
      <div className="flex items-center justify-between text-xs tabular font-medium">
        <span className={cn("font-bold", textColor)}>
          {current} {unit}
        </span>
        <span className="text-[#56675E]">mín: {min}</span>
      </div>
      <div className="w-full h-1.5 bg-[#E1E9E4] rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300 rounded-full", barColor)}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        />
      </div>
    </div>
  );
};
