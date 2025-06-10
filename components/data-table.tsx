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
  GripVerticalIcon,
  Loader2,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  XCircleIcon,
  PencilIcon,
  EyeIcon,
} from "lucide-react"
import { z } from "zod"
import { useRouter } from "next/navigation"

import { AddSectionForm } from "./add-section-form"
import { SuccessDialog } from "./success-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-provider"

// Definición del esquema de autorización
const authorizationSchema = z.object({
  name: z.string(),
  role: z.string(),
  status: z.enum(["approved", "rejected", "pending"]),
  date: z.string(),
})

// Actualizar el esquema para incluir los enlaces
export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string().optional(),
  limit: z.string().optional(),
  limit_date: z.string(),
  reviewer: z.string(),
  authorizations: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        status: z.enum(["approved", "rejected", "pending"]),
        date: z.string(),
      }),
    )
    .optional(),
  links: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        url: z.string(),
      }),
    )
    .optional(),
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

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[]
}) {
  const router = useRouter()
  const { user, userTypes, isSuperuser } = useAuth()
  const [data, setData] = React.useState(() => {
    // Filtrar los datos según los tipos de usuario
    if (user && userTypes.length > 0 && !isSuperuser) {
      console.log(`Filtrando datos iniciales para userTypes: ${userTypes.join(", ")}`)

      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/ñ/g, "n")
      }

      const filteredData = initialData.filter((item) => {
        const matchesType = userTypes.some((userType) => {
          if (userType === "todos") return true

          const normalizedUserType = normalizeText(userType)
          const normalizedItemType = normalizeText(item.type)
          const matches = normalizedItemType.includes(normalizedUserType)

          console.log(`Item: ${item.header}, Tipo: ${item.type}, UserType: ${userType}, Match: ${matches}`)
          return matches
        })

        return matchesType
      })

      console.log(`Datos iniciales filtrados: ${filteredData.length} de ${initialData.length}`)
      return filteredData
    }
    return initialData
  })
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFiltersState] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const sortableId = React.useId()
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data?.map(({ id }) => id) || [], [data])

  // Función para refrescar los datos
  const refreshData = React.useCallback(async () => {
    try {
      // Aquí deberías hacer una llamada a la API para obtener los datos actualizados
      // Por ahora, incrementamos el refreshKey para forzar un re-render
      setRefreshKey((prev) => prev + 1)
      // En una implementación real, harías algo como:
      // const newData = await documentoCompletoApi.getAll()
      // setData(newData)
    } catch (error) {
      console.error("Error refreshing data:", error)
    }
  }, [])

  // Función para ver detalles de un elemento
  const handleViewDetails = (id: number) => {
    router.push(`/dashboard/edit/${id}`)
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
        return (
          <Button
            variant="link"
            className="w-fit px-0 text-left text-foreground"
            onClick={() => handleViewDetails(row.original.id)}
          >
            {row.original.header}
          </Button>
        )
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
            icon = <Loader2 className="text-yellow-500 dark:text-yellow-400" />
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
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
              size="icon"
            >
              <MoreVerticalIcon />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={() => handleViewDetails(row.original.id)}>
              <EyeIcon className="mr-2 h-4 w-4" />
              Ver
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleViewDetails(row.original.id)}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem>Hacer una copia</DropdownMenuItem>
            <DropdownMenuItem>Favorito</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Actualizar la función handleAddSection para incluir los enlaces
  const handleAddSection = (formData: {
    header: string
    type: string
    limit_date: string
    reviewer: string
    target: number
    limit: number
    files?: File[]
  }) => {
    // Crear un nuevo ID (el máximo ID actual + 1)
    const newId = Math.max(...data.map((item) => item.id)) + 1

    // Crear el nuevo registro con estado "No Iniciado"
    const newSection: z.infer<typeof schema> = {
      id: newId,
      header: formData.header,
      type: formData.type,
      status: "No Iniciado",
      limit_date: formData.limit_date,
      reviewer: formData.reviewer,
      target: formData.target.toString(),
      limit: formData.limit.toString(),
      authorizations: [
        {
          name: "Carlos Méndez",
          role: "Director de Proyecto",
          status: "pending",
          date: "",
        },
        {
          name: "María García",
          role: "Gerente de Calidad",
          status: "pending",
          date: "",
        },
        {
          name: "Laura Sánchez",
          role: "Directora Financiera",
          status: "pending",
          date: "",
        },
      ],
    }

    // Añadir el nuevo registro al principio de los datos
    setData([newSection, ...data])
  }

  const handleSuccess = () => {
    setSheetOpen(false) // Cerrar el sheet
    refreshData() // Refrescar los datos
    setSuccessDialogOpen(true) // Mostrar el dialog de éxito
  }

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

  // Count items by type and status - updated for multiple user types
  const counts = React.useMemo(() => {
    const result = {
      todos: { total: 0, noIniciado: 0 },
      humanitario: { total: 0, noIniciado: 0 },
      psicosocial: { total: 0, noIniciado: 0 },
      legal: { total: 0, noIniciado: 0 },
      comunicacion: { total: 0, noIniciado: 0 },
      almacen: { total: 0, noIniciado: 0 },
    }

    data.forEach((item) => {
      const type = item.type.toLowerCase()
      result.todos.total++

      if (item.status === "No Iniciado") {
        result.todos.noIniciado++
      }

      // Map the type to our categories
      switch (type) {
        case "humanitario":
          result.humanitario.total++
          if (item.status === "No Iniciado") result.humanitario.noIniciado++
          break
        case "psicosocial":
          result.psicosocial.total++
          if (item.status === "No Iniciado") result.psicosocial.noIniciado++
          break
        case "legal":
          result.legal.total++
          if (item.status === "No Iniciado") result.legal.noIniciado++
          break
        case "comunicación":
        case "comunicacion":
          result.comunicacion.total++
          if (item.status === "No Iniciado") result.comunicacion.noIniciado++
          break
        case "almacén":
        case "almacen":
          result.almacen.total++
          if (item.status === "No Iniciado") result.almacen.noIniciado++
          break
      }
    })

    return result
  }, [data])

  // Filter data based on the selected tab
  const getFilteredData = (tabValue: string) => {
    if (tabValue === "todos") return data

    // Función para normalizar texto (quitar acentos y convertir a minúsculas)
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/ñ/g, "n")
    }

    const normalizedTabValue = normalizeText(tabValue)

    const filteredData = data.filter((item) => {
      const normalizedItemType = normalizeText(item.type)
      const matches = normalizedItemType.includes(normalizedTabValue)

      console.log(
        `Filtro: tab="${tabValue}" (${normalizedTabValue}), item="${item.type}" (${normalizedItemType}), match=${matches}`,
      )
      return matches
    })

    console.log(`Datos filtrados para ${tabValue}: ${filteredData.length} elementos`)
    return filteredData
  }

  // Determine which tabs to show based on user types
  const availableTabs = React.useMemo(() => {
    if (isSuperuser) {
      return ["humanitario", "psicosocial", "legal", "comunicacion", "almacen"]
    }
    return userTypes || []
  }, [userTypes, isSuperuser])

  // Default tab should be the first available type or "todos" for superuser or multi-type users
  const defaultTab = React.useMemo(() => {
    if (isSuperuser || (userTypes && userTypes.length > 1)) {
      return "todos"
    }
    return availableTabs[0] || "humanitario"
  }, [availableTabs, isSuperuser, userTypes])

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
    onColumnFiltersChange: setColumnFiltersState,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <>
      <Tabs defaultValue={defaultTab} className="flex w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="view-selector" className="sr-only">
            Vista
          </Label>
          <Select defaultValue={defaultTab}>
            <SelectTrigger className="@4xl/main:hidden flex w-fit" id="view-selector">
              <SelectValue placeholder="Seleccionar una vista" />
            </SelectTrigger>
            <SelectContent>
              {(isSuperuser || (userTypes && userTypes.length > 1)) && (
                <SelectItem value="todos">
                  Todos
                  {counts.todos.noIniciado > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      {counts.todos.noIniciado}
                    </Badge>
                  )}
                </SelectItem>
              )}
              {availableTabs.includes("humanitario") && (
                <SelectItem value="humanitario">
                  Humanitario
                  {counts.humanitario.noIniciado > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      {counts.humanitario.noIniciado}
                    </Badge>
                  )}
                </SelectItem>
              )}
              {availableTabs.includes("psicosocial") && (
                <SelectItem value="psicosocial">
                  Psicosocial
                  {counts.psicosocial.noIniciado > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      {counts.psicosocial.noIniciado}
                    </Badge>
                  )}
                </SelectItem>
              )}
              {availableTabs.includes("legal") && (
                <SelectItem value="legal">
                  Legal
                  {counts.legal.noIniciado > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      {counts.legal.noIniciado}
                    </Badge>
                  )}
                </SelectItem>
              )}
              {availableTabs.includes("comunicacion") && (
                <SelectItem value="comunicacion">
                  Comunicación
                  {counts.comunicacion.noIniciado > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      {counts.comunicacion.noIniciado}
                    </Badge>
                  )}
                </SelectItem>
              )}
              {availableTabs.includes("almacen") && (
                <SelectItem value="almacen">
                  Almacén
                  {counts.almacen.noIniciado > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      {counts.almacen.noIniciado}
                    </Badge>
                  )}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <TabsList className="@4xl/main:flex hidden">
            {(isSuperuser || (userTypes && userTypes.length > 1)) && (
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
            )}
            {availableTabs.includes("humanitario") && (
              <TabsTrigger value="humanitario" className="flex items-center gap-1">
                Humanitario
                {counts.humanitario.noIniciado > 0 && (
                  <Badge
                    variant="secondary"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
                  >
                    {counts.humanitario.noIniciado}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {availableTabs.includes("psicosocial") && (
              <TabsTrigger value="psicosocial" className="flex items-center gap-1">
                Psicosocial
                {counts.psicosocial.noIniciado > 0 && (
                  <Badge
                    variant="secondary"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
                  >
                    {counts.psicosocial.noIniciado}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {availableTabs.includes("legal") && (
              <TabsTrigger value="legal" className="flex items-center gap-1">
                Legal
                {counts.legal.noIniciado > 0 && (
                  <Badge
                    variant="secondary"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
                  >
                    {counts.legal.noIniciado}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {availableTabs.includes("comunicacion") && (
              <TabsTrigger value="comunicacion" className="flex items-center gap-1">
                Comunicación
                {counts.comunicacion.noIniciado > 0 && (
                  <Badge
                    variant="secondary"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
                  >
                    {counts.comunicacion.noIniciado}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {availableTabs.includes("almacen") && (
              <TabsTrigger value="almacen" className="flex items-center gap-1">
                Almacén
                {counts.almacen.noIniciado > 0 && (
                  <Badge
                    variant="secondary"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
                  >
                    {counts.almacen.noIniciado}
                  </Badge>
                )}
              </TabsTrigger>
            )}
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
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  <span className="hidden lg:inline">Añadir Sección</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col">
                <SheetHeader className="gap-1">
                  <SheetTitle>Añadir Nueva Sección</SheetTitle>
                  <SheetDescription>Completa los detalles para crear una nueva sección.</SheetDescription>
                </SheetHeader>
                <AddSectionForm onAddSection={handleAddSection} onSuccess={handleSuccess} />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Contenedor con altura fija para todas las pestañas */}
        <div className="flex-1" key={refreshKey}>
          {/* Render tabs based on available types */}
          {(isSuperuser || (userTypes && userTypes.length > 1)) && (
            <TabsContent value="todos" className="h-full">
              <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
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
                    {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length}{" "}
                    fila(s) seleccionada(s).
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
              </div>
            </TabsContent>
          )}

          {/* Generate TabsContent for each available type */}
          {availableTabs.map((tabType) => (
            <TabsContent key={tabType} value={tabType} className="h-full">
              <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
                <div className="overflow-hidden rounded-lg border">
                  <DndContext
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                    sensors={sensors}
                    id={`${sortableId}-${tabType}`}
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
                        {getFilteredData(tabType).length > 0 ? (
                          <SortableContext
                            items={getFilteredData(tabType).map((item) => item.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {getFilteredData(tabType).map((item) => {
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
                <div className="flex items-center justify-between px-4">
                  <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
                    {getFilteredData(tabType).length} de {getFilteredData(tabType).length} fila(s)
                  </div>
                  <div className="flex w-full items-center gap-8 lg:w-fit">
                    <div className="flex w-fit items-center justify-center text-sm font-medium">Página 1 de 1</div>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Success Dialog */}
      <SuccessDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title="¡Documento creado exitosamente!"
        description="El documento se ha generado correctamente y ya está disponible en la tabla."
      />
    </>
  )
}

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
