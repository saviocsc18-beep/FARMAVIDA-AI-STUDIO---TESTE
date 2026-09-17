import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/ui";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "lg",
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    full: "max-w-[95vw]",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#13231B]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Dialog Box */}
      <div
        className={cn(
          "relative w-full bg-white rounded-[20px] shadow-2xl border border-[#E1E9E4] overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150",
          maxWidthStyles[maxWidth],
          className
        )}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[#E1E9E4] bg-white sticky top-0 z-10">
            <div className="space-y-1 pr-6">
              {title && <h3 className="text-lg font-bold text-[#13231B]">{title}</h3>}
              {subtitle && <p className="text-xs sm:text-sm text-[#56675E]">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#56675E] hover:text-[#13231B] hover:bg-[#F3F7F4] transition-colors shrink-0 cursor-pointer"
              aria-label="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[#E1E9E4] bg-[#F3F7F4]/60 sticky bottom-0 z-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "brand";
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "brand",
  loading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "dangerSolid" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#56675E] leading-relaxed">{description}</p>
    </Modal>
  );
};
