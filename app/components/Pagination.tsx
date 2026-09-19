'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  itemPluralName?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  const delta = 1;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    } else if (
      (i === currentPage - delta - 1 && i > 1) ||
      (i === currentPage + delta + 1 && i < totalPages)
    ) {
      pages.push('...');
    }
  }

  // Remove elipses consecutivas
  const result: (number | string)[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (pages[i] === '...' && result[result.length - 1] === '...') {
      continue;
    }
    result.push(pages[i]);
  }

  return result;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [5, 10, 20, 50],
  itemName = 'item',
  itemPluralName = 'itens',
}: PaginationProps) {
  if (totalItems === 0) return null;

  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageNumbers = getPageNumbers(safePage, totalPages);

  return (
    <div className="border-t border-slate-200 bg-slate-50/70 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 select-none">
      {/* Informações e Seletor de Linhas */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
        <span>
          Mostrando <strong className="font-bold text-slate-900">{startIndex + 1}</strong> a{' '}
          <strong className="font-bold text-slate-900">{endIndex}</strong> de{' '}
          <strong className="font-bold text-slate-900">{totalItems}</strong>{' '}
          {totalItems === 1 ? itemName : itemPluralName}
        </span>

        {onItemsPerPageChange && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-3">
            <span className="text-slate-500 font-medium">Exibir:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onItemsPerPageChange(newSize);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
              aria-label="Itens por página"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} por página
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de Navegação de Página */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Primeira Página */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Primeira página"
            aria-label="Ir para a primeira página"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Página Anterior */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Página anterior"
            aria-label="Ir para a página anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Números das Páginas */}
          <div className="flex items-center gap-1 mx-1">
            {pageNumbers.map((item, idx) => {
              if (item === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400 font-semibold text-xs">
                    ...
                  </span>
                );
              }

              const pageNum = item as number;
              const isActive = pageNum === safePage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                  aria-label={`Página ${pageNum}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Próxima Página */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Próxima página"
            aria-label="Ir para a próxima página"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Última Página */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Última página"
            aria-label="Ir para a última página"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
