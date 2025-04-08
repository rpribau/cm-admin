"use client"

import * as React from "react"
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ClockIcon,
  GripVerticalIcon,
  LoaderIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  XCircleIcon,
} from "lucide-react"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Definición del esquema de autorización
const authorizationSchema = z.object({
  name: z.string(),
  role: z.string(),
  status: z.enum(["approved", "rejected", "pending"]),
  date: z.string(),
})

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string().optional(),
  limit: z.string().optional(),
  limit_date: z.string(),
  reviewer: z.string(),
  authorizations: z.array(authorizationSchema).optional(),
})

// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Arrastrar para reordenar</span>
    </Button>
  )
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div className="text-center">{row.original.id}</div>,
  },
  {
    accessorKey: "header",
    header: "Encabezado",
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="px-1.5 text-muted-foreground">
          {row.original.type}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.original.status
      let icon
      let colorClass

      switch (status) {
        case "Completado":
          icon = <CheckCircle2Icon className="text-green-500 dark:text-green-400" />
          colorClass = "text-green-500 dark:text-green-400"
          break
        case "En Proceso":
          icon = <LoaderIcon className="text-yellow-500 dark:text-yellow-400" />
          colorClass = "text-yellow-500 dark:text-yellow-400"
          break
        case "No Iniciado":
          icon = <AlertCircleIcon className="text-blue-500 dark:text-blue-400" />
          colorClass = "text-blue-500 dark:text-blue-400"
          break
        case "Rechazado":
          icon = <XCircleIcon className="text-red-500 dark:text-red-400" />
          colorClass = "text-red-500 dark:text-red-400"
          break
        default:
          icon = <AlertCircleIcon className="text-gray-500 dark:text-gray-400" />
          colorClass = "text-gray-500 dark:text-gray-400"
      }

      return (
        <Badge variant="outline" className={`flex gap-1 px-1.5 text-muted-foreground [&_svg]:size-3`}>
          <span className={colorClass}>{icon}</span>
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "limit_date",
    header: "Fecha Límite",
    cell: ({ row }) => (
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.limit_date}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "reviewer",
    header: "Revisor",
    cell: ({ row }) => {
      const isAssigned = row.original.reviewer !== "Asignar revisor"

      if (isAssigned) {
        return row.original.reviewer
      }

      return (
        <>
          <Label htmlFor={`${row.original.id}-reviewer`} className="sr-only">
            Revisor
          </Label>
          <Select>
            <SelectTrigger className="h-8 w-40" id={`${row.original.id}-reviewer`}>
              <SelectValue placeholder="Asignar revisor" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
              <SelectItem value="Jamik Tashpulatov">Jamik Tashpulatov</SelectItem>
            </SelectContent>
          </Select>
        </>
      )
    },
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex size-8 text-muted-foreground data-[state=open]:bg-muted" size="icon">
            <MoreVerticalIcon />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Editar</DropdownMenuItem>
          <DropdownMenuItem>Hacer una copia</DropdownMenuItem>
          <DropdownMenuItem>Favorito</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  )
}

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[]
}) {
  const [data, setData] = React.useState(() => initialData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const sortableId = React.useId()
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data?.map(({ id }) => id) || [], [data])

  // Count items by type and status
  const counts = React.useMemo(() => {
    const result = {
      todos: { total: 0, noIniciado: 0 },
      alta: { total: 0, noIniciado: 0 },
      marketing: { total: 0, noIniciado: 0 },
      servicios: { total: 0, noIniciado: 0 },
      pagos: { total: 0, noIniciado: 0 },
      otros: { total: 0, noIniciado: 0 },
    }

    data.forEach((item) => {
      const type = item.type.toLowerCase()
      result.todos.total++

      if (item.status === "No Iniciado") {
        result.todos.noIniciado++
      }

      // Map the type to our categories
      switch (type) {
        case "alta":
          result.alta.total++
          if (item.status === "No Iniciado") result.alta.noIniciado++
          break
        case "marketing":
          result.marketing.total++
          if (item.status === "No Iniciado") result.marketing.noIniciado++
          break
        case "servicios":
          result.servicios.total++
          if (item.status === "No Iniciado") result.servicios.noIniciado++
          break
        case "pagos":
          result.pagos.total++
          if (item.status === "No Iniciado") result.pagos.noIniciado++
          break
        case "otros":
          result.otros.total++
          if (item.status === "No Iniciado") result.otros.noIniciado++
          break
      }
    })

    return result
  }, [data])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  // Filter data based on the selected tab
  const getFilteredData = (tabValue: string) => {
    if (tabValue === "todos") return data
    return data.filter((item) => item.type.toLowerCase() === tabValue.toLowerCase())
  }

  return (
    <Tabs defaultValue="todos" className="flex w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          Vista
        </Label>
        <Select defaultValue="todos">
          <SelectTrigger className="@4xl/main:hidden flex w-fit" id="view-selector">
            <SelectValue placeholder="Seleccionar una vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">
              Todos
              {counts.todos.noIniciado > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                  {counts.todos.noIniciado}
                </Badge>
              )}
            </SelectItem>
            <SelectItem value="alta">
              Alta
              {counts.alta.noIniciado > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                  {counts.alta.noIniciado}
                </Badge>
              )}
            </SelectItem>
            <SelectItem value="marketing">
              Marketing
              {counts.marketing.noIniciado > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                  {counts.marketing.noIniciado}
                </Badge>
              )}
            </SelectItem>
            <SelectItem value="servicios">
              Servicios
              {counts.servicios.noIniciado > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                  {counts.servicios.noIniciado}
                </Badge>
              )}
            </SelectItem>
            <SelectItem value="pagos">
              Pagos
              {counts.pagos.noIniciado > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                  {counts.pagos.noIniciado}
                </Badge>
              )}
            </SelectItem>
            <SelectItem value="otros">
              Otros
              {counts.otros.noIniciado > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                  {counts.otros.noIniciado}
                </Badge>
              )}
            </SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="@4xl/main:flex hidden">
          <TabsTrigger value="todos" className="flex items-center gap-1">
            Todos
            {counts.todos.noIniciado > 0 && (
              <Badge
                variant="secondary"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
              >
                {counts.todos.noIniciado}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alta" className="flex items-center gap-1">
            Alta
            {counts.alta.noIniciado > 0 && (
              <Badge
                variant="secondary"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
              >
                {counts.alta.noIniciado}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-1">
            Marketing
            {counts.marketing.noIniciado > 0 && (
              <Badge
                variant="secondary"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
              >
                {counts.marketing.noIniciado}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="servicios" className="flex items-center gap-1">
            Servicios
            {counts.servicios.noIniciado > 0 && (
              <Badge
                variant="secondary"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
              >
                {counts.servicios.noIniciado}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pagos" className="flex items-center gap-1">
            Pagos
            {counts.pagos.noIniciado > 0 && (
              <Badge
                variant="secondary"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
              >
                {counts.pagos.noIniciado}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="otros" className="flex items-center gap-1">
            Otros
            {counts.otros.noIniciado > 0 && (
              <Badge
                variant="secondary"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
              >
                {counts.otros.noIniciado}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por encabezado..."
              className="pl-8"
              value={(table.getColumn("header")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("header")?.setFilterValue(event.target.value)}
            />
          </div>
          <Button variant="outline" size="sm">
            <PlusIcon />
            <span className="hidden lg:inline">Añadir Sección</span>
          </Button>
        </div>
      </div>
      <TabsContent value="todos" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No hay resultados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} fila(s)
            seleccionada(s).
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Filas por página
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Ir a la primera página</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Ir a la página anterior</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Ir a la última página</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="alta" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={`${sortableId}-alta`}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {getFilteredData("alta").length > 0 ? (
                  <SortableContext
                    items={getFilteredData("alta").map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {getFilteredData("alta").map((item) => {
                      const row = table.getRow(item.id.toString())
                      return row ? <DraggableRow key={row.id} row={row} /> : null
                    })}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No hay resultados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </TabsContent>
      <TabsContent value="marketing" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={`${sortableId}-marketing`}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {getFilteredData("marketing").length > 0 ? (
                  <SortableContext
                    items={getFilteredData("marketing").map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {getFilteredData("marketing").map((item) => {
                      const row = table.getRow(item.id.toString())
                      return row ? <DraggableRow key={row.id} row={row} /> : null
                    })}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No hay resultados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </TabsContent>
      <TabsContent value="servicios" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={`${sortableId}-servicios`}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {getFilteredData("servicios").length > 0 ? (
                  <SortableContext
                    items={getFilteredData("servicios").map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {getFilteredData("servicios").map((item) => {
                      const row = table.getRow(item.id.toString())
                      return row ? <DraggableRow key={row.id} row={row} /> : null
                    })}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No hay resultados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </TabsContent>
      <TabsContent value="pagos" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={`${sortableId}-pagos`}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {getFilteredData("pagos").length > 0 ? (
                  <SortableContext
                    items={getFilteredData("pagos").map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {getFilteredData("pagos").map((item) => {
                      const row = table.getRow(item.id.toString())
                      return row ? <DraggableRow key={row.id} row={row} /> : null
                    })}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No hay resultados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </TabsContent>
      <TabsContent value="otros" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={`${sortableId}-otros`}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {getFilteredData("otros").length > 0 ? (
                  <SortableContext
                    items={getFilteredData("otros").map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {getFilteredData("otros").map((item) => {
                      const row = table.getRow(item.id.toString())
                      return row ? <DraggableRow key={row.id} row={row} /> : null
                    })}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No hay resultados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </TabsContent>
    </Tabs>
  )
}

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const isMobile = useIsMobile()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">
          {item.header}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>{item.header}</SheetTitle>
          <SheetDescription>Detalles del documento</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
          <Separator />

          {/* Información del documento */}
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Información General</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="grid grid-cols-2 gap-1">
                  <div className="font-medium text-muted-foreground">ID:</div>
                  <div>{item.id}</div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="font-medium text-muted-foreground">Tipo:</div>
                  <div>{item.type}</div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="font-medium text-muted-foreground">Estado:</div>
                  <div className="flex items-center gap-1">
                    {item.status === "Completado" ? (
                      <CheckCircle2Icon className="h-4 w-4 text-green-500" />
                    ) : item.status === "En Proceso" ? (
                      <LoaderIcon className="h-4 w-4 text-yellow-500" />
                    ) : item.status === "No Iniciado" ? (
                      <AlertCircleIcon className="h-4 w-4 text-blue-500" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-500" />
                    )}
                    {item.status}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="font-medium text-muted-foreground">Fecha Límite:</div>
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    {item.limit_date}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="font-medium text-muted-foreground">Revisor:</div>
                  <div>{item.reviewer}</div>
                </div>
                {item.target && (
                  <div className="grid grid-cols-2 gap-1">
                    <div className="font-medium text-muted-foreground">Objetivo:</div>
                    <div>{item.target}</div>
                  </div>
                )}
                {item.limit && (
                  <div className="grid grid-cols-2 gap-1">
                    <div className="font-medium text-muted-foreground">Límite:</div>
                    <div>{item.limit}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sección de Autorizaciones y Firmas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Autorizaciones y Firmas</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {item.authorizations && item.authorizations.length > 0 ? (
                  item.authorizations.map((auth, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <div className="font-medium">{auth.name}</div>
                        <div className="text-xs text-muted-foreground">{auth.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {auth.status === "approved" ? (
                          <>
                            <CheckCircle2Icon className="h-5 w-5 text-green-500" />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-green-600">Aprobado</span>
                              {auth.date && <span className="text-xs text-muted-foreground">{auth.date}</span>}
                            </div>
                          </>
                        ) : auth.status === "rejected" ? (
                          <>
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-red-600">Rechazado</span>
                              {auth.date && <span className="text-xs text-muted-foreground">{auth.date}</span>}
                            </div>
                          </>
                        ) : (
                          <>
                            <ClockIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">Pendiente</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground">No hay autorizaciones registradas</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

        
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full">Editar</Button>
          <Button variant="destructive" className="w-full">
            Eliminar
          </Button>
          <Button variant="outline" className="w-full">
            Cancelar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
