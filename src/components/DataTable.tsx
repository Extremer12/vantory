import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronsUpDown, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  searchColumn?: string
  // New props for manual pagination
  pageCount?: number
  pageIndex?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Buscar...",
  searchColumn,
  pageCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [globalFilter, setGlobalFilter] = React.useState("")

  const isManualPagination = pageCount !== undefined

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: isManualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    manualPagination: isManualPagination,
    pageCount: pageCount,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      ...(isManualPagination ? {
        pagination: {
          pageIndex: pageIndex ?? 0,
          pageSize: pageSize ?? 10,
        }
      } : {})
    },
  })

  // To allow global search to just work on everything out of the box
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchColumn ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? "" : globalFilter ?? ""}
            onChange={(event) => {
              if (searchColumn) {
                table.getColumn(searchColumn)?.setFilterValue(event.target.value)
              } else {
                setGlobalFilter(String(event.target.value))
              }
            }}
            className="pl-9 h-10 bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
          />
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-card backdrop-blur-md shadow-card overflow-hidden">
        <div className="min-w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 border-b border-white/10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <th key={header.id} className="h-12 px-5 align-middle font-medium text-muted-foreground">
                        {header.isPlaceholder ? null : (
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? "cursor-pointer select-none flex items-center hover:text-foreground transition-colors"
                                : "",
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: <ChevronDown className="ml-2 h-4 w-4 rotate-180 transition-transform" />,
                              desc: <ChevronDown className="ml-2 h-4 w-4 transition-transform" />,
                            }[header.column.getIsSorted() as string] ?? null}
                            {header.column.getCanSort() && !header.column.getIsSorted() && (
                              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            )}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-white/5 transition-colors data-[state=selected]:bg-muted"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-5 align-middle">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-40 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 py-8">
                        <Search className="w-8 h-8 text-muted-foreground/30" />
                        <span className="text-sm font-medium text-muted-foreground">No se encontraron resultados</span>
                        <span className="text-xs text-muted-foreground/60">Intenta ajustar tu búsqueda o filtros</span>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 py-2">
        <div className="flex-1 text-sm text-muted-foreground">
          Página {(isManualPagination ? (pageIndex ?? 0) : table.getState().pagination.pageIndex) + 1} de{" "}
          {isManualPagination ? (pageCount || 1) : (table.getPageCount() || 1)}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => isManualPagination ? onPageChange?.((pageIndex ?? 0) - 1) : table.previousPage()}
            disabled={isManualPagination ? (pageIndex ?? 0) === 0 : !table.getCanPreviousPage()}
            className="border-white/10 bg-background/50 hover:bg-white/10"
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => isManualPagination ? onPageChange?.((pageIndex ?? 0) + 1) : table.nextPage()}
            disabled={isManualPagination ? (pageIndex ?? 0) >= (pageCount ?? 0) - 1 : !table.getCanNextPage()}
            className="border-white/10 bg-background/50 hover:bg-white/10"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
