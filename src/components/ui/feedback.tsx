import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from "lucide-react";

export type ToastType = "sucesso" | "erro" | "aviso" | "info" | "carregando";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  public subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public show(type: ToastType, title: string, description?: string, duration = 4000): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { id, type, title, description, duration };
    
    // Se for carregando ou erro, limitar lista para evitar flood
    this.toasts = [newToast, ...this.toasts.slice(0, 4)];
    this.notifyListeners();

    if (duration > 0 && type !== "carregando") {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  public dismiss(id?: string) {
    if (!id) {
      this.toasts = [];
    } else {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }
    this.notifyListeners();
  }
}

const toastManager = new ToastManager();

/**
 * API Global de Notificações FarmaVida
 */
export const notify = {
  sucesso: (titulo: string, descricao?: string) => {
    return toastManager.show("sucesso", titulo, descricao, 4000);
  },
  erro: (titulo: string, descricao?: string) => {
    return toastManager.show("erro", titulo, descricao, 5000);
  },
  aviso: (titulo: string, descricao?: string) => {
    return toastManager.show("aviso", titulo, descricao, 4500);
  },
  info: (titulo: string, descricao?: string) => {
    return toastManager.show("info", titulo, descricao, 4000);
  },
  carregando: (titulo: string) => {
    return toastManager.show("carregando", titulo, undefined, 0);
  },
  dismiss: (id?: string) => {
    toastManager.dismiss(id);
  },
};

/**
 * Componente Toaster montado no App.tsx
 */
export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toastManager.subscribe((updated) => {
      setToasts(updated);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => {
        const icons = {
          sucesso: <CheckCircle2 className="w-5 h-5 text-[#0E7A53] shrink-0 mt-0.5" />,
          erro: <AlertCircle className="w-5 h-5 text-[#B42318] shrink-0 mt-0.5" />,
          aviso: <AlertTriangle className="w-5 h-5 text-[#D98A0B] shrink-0 mt-0.5" />,
          info: <Info className="w-5 h-5 text-[#1B5C99] shrink-0 mt-0.5" />,
          carregando: <Loader2 className="w-5 h-5 text-[#0E7A53] animate-spin shrink-0 mt-0.5" />,
        };

        const bgStyles = {
          sucesso: "bg-[#E6F4EC] border-[#C2E4D2] text-[#0B6445]",
          erro: "bg-[#FDEDEB] border-[#F8B5AF] text-[#A8261B]",
          aviso: "bg-[#FFF4E0] border-[#FFE1A8] text-[#8A5300]",
          info: "bg-[#E9F2FB] border-[#BEDAF5] text-[#0C4074]",
          carregando: "bg-white border-[#E1E9E4] text-[#13231B]",
        };

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full border rounded-[14px] p-3.5 flex items-start gap-3 shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${bgStyles[t.type]}`}
          >
            {icons[t.type]}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm leading-snug">{t.title}</h4>
              {t.description && (
                <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{t.description}</p>
              )}
            </div>
            {t.type !== "carregando" && (
              <button
                type="button"
                onClick={() => toastManager.dismiss(t.id)}
                className="opacity-70 hover:opacity-100 p-0.5 rounded-md transition-opacity cursor-pointer"
                aria-label="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
