import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 15,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 15, 25, 50, 100],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Ajusta se a página atual ultrapassar o limite com novos filtros
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-4 bg-asfalto/40 border-t border-aco/50 text-xs ${className}`}
    >
      {/* Resumo de itens */}
      <div className="text-muted text-[11px] font-medium tracking-wide">
        Exibindo <span className="font-bold text-white">{startItem}</span> a{' '}
        <span className="font-bold text-white">{endItem}</span> de{' '}
        <span className="font-bold text-volt">{totalItems}</span> registros
      </div>

      {/* Controles de página e seleção de limite */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
        {/* Itens por página */}
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
              Exibir:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-asfalto border border-aco rounded-btn text-texto text-[11px] font-semibold px-2 py-1 focus:outline-none focus:border-volt transition-colors cursor-pointer"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} por pág.
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Botões de navegação */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className="w-7 h-7 rounded-btn flex items-center justify-center border border-aco/60 bg-aco/30 text-muted hover:text-white hover:bg-aco transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Primeira Página"
          >
            <ChevronsLeft size={14} />
          </button>

          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-7 h-7 rounded-btn flex items-center justify-center border border-aco/60 bg-aco/30 text-muted hover:text-white hover:bg-aco transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Página Anterior"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="h-7 px-2.5 rounded-btn border border-aco/80 bg-asfalto flex items-center justify-center font-mono font-bold text-[11px] text-white">
            <span className="text-volt">{currentPage}</span>
            <span className="text-muted/60 mx-1">/</span>
            <span>{totalPages}</span>
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="w-7 h-7 rounded-btn flex items-center justify-center border border-aco/60 bg-aco/30 text-muted hover:text-white hover:bg-aco transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Próxima Página"
          >
            <ChevronRight size={14} />
          </button>

          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="w-7 h-7 rounded-btn flex items-center justify-center border border-aco/60 bg-aco/30 text-muted hover:text-white hover:bg-aco transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Última Página"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;

