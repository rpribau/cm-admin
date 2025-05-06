"use client"
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  LinkIcon,
  Loader2,
  PencilIcon,
  XCircleIcon,
} from "lucide-react"
import type { z } from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

// Importar el esquema desde data-table.tsx
import type { schema } from "./data-table"

export function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const router = useRouter()

  // Función para manejar el clic en el botón Editar
  const handleEditClick = () => {
    // Navegar a la ruta de edición con el ID del elemento
    router.push(`/dashboard/edit/${item.id}`)
  }

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

          {/* Información del documento - Modo visualización */}
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
                      <Loader2 className="h-4 w-4 text-yellow-500" />
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

            {/* Sección de Enlaces a Documentos */}
            {item.links && item.links.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Enlaces a Documentos</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  {item.links.map((link, index) => (
                    <div
                      key={link.id || index}
                      className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{link.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(link.url, "_blank")}
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                        <span className="sr-only">Abrir enlace</span>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

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
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full" onClick={handleEditClick}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              Cerrar
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
