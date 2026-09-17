import React, { ElementType } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/ui";

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  required,
  className,
  children,
}) => {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-xs sm:text-sm font-bold text-[#13231B] flex items-center justify-between">
          <span>
            {label}
            {required && <span className="text-[#B42318] ml-1">*</span>}
          </span>
          {hint && !error && <span className="text-xs font-normal text-[#56675E]">{hint}</span>}
        </label>
      )}
      {children}
      {error && <span className="text-xs font-semibold text-[#B42318] animate-in fade-in">{error}</span>}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode | ElementType;
  iconRight?: React.ReactNode | ElementType;
  big?: boolean; // Modo PDV de 56px de altura
  error?: boolean;
}

function renderFieldIcon(iconProp: React.ReactNode | ElementType | undefined, defaultClasses = "w-4 h-4") {
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

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, iconRight, big = false, error = false, type = "text", ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#56675E]">
            {renderFieldIcon(icon, big ? "w-5 h-5" : "w-4 h-4")}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "w-full bg-white text-[#13231B] placeholder-[#84968D] border transition-all duration-150 outline-hidden font-medium",
            "focus:border-[#0E7A53] focus:ring-2 focus:ring-[#0E7A53]/20",
            error ? "border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/20" : "border-[#CFDAD3]",
            big
              ? "h-14 text-base sm:text-lg px-4 rounded-[14px]"
              : "h-11 text-sm px-3.5 rounded-[12px]",
            icon ? (big ? "pl-12" : "pl-10") : "",
            iconRight ? "pr-10" : "",
            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3.5 flex items-center text-[#56675E]">
            {renderFieldIcon(iconRight, big ? "w-5 h-5" : "w-4 h-4")}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error = false, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full bg-white text-[#13231B] border transition-all duration-150 outline-hidden font-medium h-11 text-sm px-3.5 rounded-[12px]",
          "focus:border-[#0E7A53] focus:ring-2 focus:ring-[#0E7A53]/20",
          error ? "border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/20" : "border-[#CFDAD3]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error = false, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full bg-white text-[#13231B] placeholder-[#84968D] border transition-all duration-150 outline-hidden font-medium text-sm p-3.5 rounded-[12px]",
          "focus:border-[#0E7A53] focus:ring-2 focus:ring-[#0E7A53]/20",
          error ? "border-[#B42318] focus:border-[#B42318] focus:ring-[#B42318]/20" : "border-[#CFDAD3]",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export interface ChipsProps<T extends string = string> {
  options: { id: T; label: string; count?: number; icon?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Chips<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: ChipsProps<T>) {
  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1", className)}>
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap select-none cursor-pointer border",
              isActive
                ? "bg-[#0E7A53] text-white border-[#0E7A53] shadow-xs"
                : "bg-white text-[#56675E] border-[#E1E9E4] hover:bg-[#F3F7F4] hover:text-[#13231B]"
            )}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {typeof opt.count === "number" && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[11px] tabular font-extrabold",
                  isActive ? "bg-white/20 text-white" : "bg-[#F3F7F4] text-[#56675E]"
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TabsProps<T extends string = string> {
  tabs: { id: T; label: string; count?: number; icon?: React.ReactNode }[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: "underline" | "pills";
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className,
}: TabsProps<T>) {
  if (variant === "pills") {
    return (
      <div className={cn("flex items-center gap-1 p-1 bg-[#F3F7F4] rounded-[12px] border border-[#E1E9E4]", className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-[10px] text-xs sm:text-sm font-bold transition-all select-none cursor-pointer",
                isActive
                  ? "bg-white text-[#0E7A53] shadow-xs"
                  : "text-[#56675E] hover:text-[#13231B]"
              )}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs tabular font-extrabold",
                    isActive ? "bg-[#E6F4EC] text-[#0B6445]" : "bg-[#E1E9E4] text-[#56675E]"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-4 border-b border-[#E1E9E4] overflow-x-auto no-scrollbar", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 py-3 px-1 border-b-2 font-bold text-xs sm:text-sm transition-all whitespace-nowrap select-none cursor-pointer",
              isActive
                ? "border-[#0E7A53] text-[#0E7A53]"
                : "border-transparent text-[#56675E] hover:text-[#13231B] hover:border-[#CFDAD3]"
            )}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs tabular font-extrabold",
                  isActive ? "bg-[#E6F4EC] text-[#0B6445]" : "bg-[#F3F7F4] text-[#56675E]"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface QtyStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export const QtyStepper: React.FC<QtyStepperProps> = ({
  value,
  min = 1,
  max = 9999,
  step = 1,
  onChange,
  size = "md",
  className,
  disabled = false,
}) => {
  const sizeStyles = {
    sm: "h-8 min-w-[100px]",
    md: "h-11 min-w-[130px]",
    lg: "h-14 min-w-[160px]",
  };

  const buttonSizeStyles = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-14 h-14",
  };

  const fontSizeStyles = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-extrabold",
  };

  const handleDecrease = () => {
    if (value > min) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(Math.min(max, value + step));
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center justify-between bg-white border border-[#CFDAD3] rounded-[12px] p-0.5 shadow-2xs select-none",
        sizeStyles[size],
        disabled ? "opacity-50 pointer-events-none" : "",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={handleDecrease}
        className={cn(
          "inline-flex items-center justify-center rounded-[10px] bg-[#F3F7F4] hover:bg-[#E6F4EC] text-[#13231B] hover:text-[#0E7A53] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95",
          buttonSizeStyles[size]
        )}
        aria-label="Diminuir quantidade"
      >
        <Minus className="w-4 h-4" />
      </button>

      <span
        className={cn(
          "px-2 font-bold text-[#13231B] text-center tabular flex-1",
          fontSizeStyles[size]
        )}
      >
        {value}
      </span>

      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={handleIncrease}
        className={cn(
          "inline-flex items-center justify-center rounded-[10px] bg-[#F3F7F4] hover:bg-[#E6F4EC] text-[#13231B] hover:text-[#0E7A53] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer active:scale-95",
          buttonSizeStyles[size]
        )}
        aria-label="Aumentar quantidade"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
