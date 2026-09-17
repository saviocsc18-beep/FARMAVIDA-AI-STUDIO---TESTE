import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/ui";
import { EmptyState } from "./Layout";

export interface Column<T> {
  key: string;
  header: string | React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  keyExtractor?: (row: T, index: number) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Não há dados cadastrados ou os filtros atuais não retornaram resultados.",
  onRowClick,
  className,
  keyExtractor,
}: DataTableProps<T>) {
  const getAlignment = (align?: "left" | "center" | "right") => {
    if (align === "right") return "text-right justify-end";
    if (align === "center") return "text-center justify-center";
    return "text-left justify-start";
  };

  return (
    <div className={cn("w-full overflow-hidden border border-[#E1E9E4] rounded-[16px] bg-white shadow-xs", className)}>
      <div className="overflow-x-auto no-scrollbar max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          {/* Cabeçalho Fixo */}
          <thead className="bg-[#F3F7F4] sticky top-0 z-10 border-b border-[#E1E9E4]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    "py-3.5 px-4 text-xs font-bold text-[#56675E] uppercase tracking-wider select-none",
                    getAlignment(col.align)
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Corpo da Tabela */}
          <tbody className="divide-y divide-[#E1E9E4] text-sm text-[#13231B]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-[#56675E]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0E7A53]" />
                    <span className="text-xs font-semibold">Carregando dados...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-4">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = keyExtractor ? keyExtractor(row, index) : (row as unknown as { id?: string | number }).id ?? index;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      "min-h-[52px] h-[52px] transition-colors",
                      onRowClick
                        ? "cursor-pointer hover:bg-[#F0F9F4] active:bg-[#E6F4EC]"
                        : "hover:bg-[#F3F7F4]/50"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "py-3 px-4 font-medium",
                          getAlignment(col.align)
                        )}
                      >
                        {col.render
                          ? col.render(row, index)
                          : String((row as Record<string, unknown>)[col.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface CellStackProps {
  primary: string | React.ReactNode;
  secondary?: string | React.ReactNode;
  tertiary?: string | React.ReactNode;
  className?: string;
}

export const CellStack: React.FC<CellStackProps> = ({
  primary,
  secondary,
  tertiary,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="font-bold text-[#13231B] text-sm leading-tight">{primary}</span>
      {secondary && <span className="text-xs text-[#56675E] leading-tight">{secondary}</span>}
      {tertiary && <span className="text-xs text-[#84968D] leading-tight">{tertiary}</span>}
    </div>
  );
};

export interface CellNumberProps {
  value: string | number;
  prefix?: string;
  suffix?: string;
  variant?: "default" | "brand" | "danger" | "warn";
  className?: string;
}

export const CellNumber: React.FC<CellNumberProps> = ({
  value,
  prefix,
  suffix,
  variant = "default",
  className,
}) => {
  const variantStyles = {
    default: "text-[#13231B]",
    brand: "text-[#0E7A53] font-bold",
    danger: "text-[#B42318] font-bold",
    warn: "text-[#8A5300] font-bold",
  };

  return (
    <span className={cn("tabular font-semibold text-sm", variantStyles[variant], className)}>
      {prefix && <span className="text-xs text-[#56675E] mr-1">{prefix}</span>}
      <span>{value}</span>
      {suffix && <span className="text-xs text-[#56675E] ml-1">{suffix}</span>}
    </span>
  );
};

export interface CellCodeProps {
  code: string | number;
  className?: string;
}

export const CellCode: React.FC<CellCodeProps> = ({ code, className }) => {
  return (
    <code
      className={cn(
        "font-mono text-xs px-2 py-0.5 bg-[#F3F7F4] text-[#13231B] border border-[#E1E9E4] rounded-md tabular font-semibold",
        className
      )}
    >
      {code}
    </code>
  );
};
