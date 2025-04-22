"use client"

import * as React from "react"
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
import { es } from "date-fns/locale"
import type { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

// Importar el esquema desde data-table.tsx
import type { schema } from "./data-table"

export function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editedItem, setEditedItem] = React.useState<z.infer<typeof schema>>(item)
  const [date, setDate] = React.useState<Date | undefined>(new Date(item.limit_date))
  const [loading, setLoading] = React.useState(false)

  // Función para simular el guardado de cambios
  const handleSave = () => {
    setLoading(true)
    // Simulamos una operación asíncrona
    setTimeout(() => {
      setLoading(false)
      setIsEditDialogOpen(false)
      toast.success("Cambios guardados correctamente")
    }, 1000)
  }

  return (
    <>
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
            <Button className="w-full" onClick={() => setIsEditDialogOpen(true)}>
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

      {/* Diálogo de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar {item.header}</DialogTitle>
            <DialogDescription>Realiza los cambios necesarios y guarda cuando hayas terminado.</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <Label htmlFor="edit-header">Encabezado</Label>
                <Input
                  id="edit-header"
                  value={editedItem.header}
                  onChange={(e) => setEditedItem({ ...editedItem, header: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="edit-type">Tipo</Label>
                <Select
                  value={editedItem.type}
                  onValueChange={(value) => setEditedItem({ ...editedItem, type: value })}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Seleccionar un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Humanitario">Humanitario</SelectItem>
                    <SelectItem value="Psicosocial">Psicosocial</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Comunicación">Comunicación</SelectItem>
                    <SelectItem value="Almacén">Almacén</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="edit-status">Estado</Label>
                <Select
                  value={editedItem.status}
                  onValueChange={(value) => setEditedItem({ ...editedItem, status: value })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Seleccionar un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completado">Completado</SelectItem>
                    <SelectItem value="En Proceso">En Proceso</SelectItem>
                    <SelectItem value="No Iniciado">No Iniciado</SelectItem>
                    <SelectItem value="Rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="edit-limit-date">Fecha Límite</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? date.toLocaleDateString() : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => {
                        setDate(newDate)
                        if (newDate) {
                          setEditedItem({
                            ...editedItem,
                            limit_date: newDate.toISOString().split("T")[0],
                          })
                        }
                      }}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="edit-reviewer">Revisor</Label>
                <Select
                  value={editedItem.reviewer}
                  onValueChange={(value) => setEditedItem({ ...editedItem, reviewer: value })}
                >
                  <SelectTrigger id="edit-reviewer">
                    <SelectValue placeholder="Seleccionar un revisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asignar revisor">Asignar revisor</SelectItem>
                    <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
                    <SelectItem value="Jamik Tashpulatov">Jamik Tashpulatov</SelectItem>
                    <SelectItem value="Carlos Méndez">Carlos Méndez</SelectItem>
                    <SelectItem value="María García">María García</SelectItem>
                    <SelectItem value="Laura Sánchez">Laura Sánchez</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editedItem.target !== undefined && (
                <div className="flex flex-col gap-3">
                  <Label htmlFor="edit-target">Objetivo</Label>
                  <Input
                    id="edit-target"
                    value={editedItem.target}
                    onChange={(e) => setEditedItem({ ...editedItem, target: e.target.value })}
                  />
                </div>
              )}
              {editedItem.limit !== undefined && (
                <div className="flex flex-col gap-3">
                  <Label htmlFor="edit-limit">Límite</Label>
                  <Input
                    id="edit-limit"
                    value={editedItem.limit}
                    onChange={(e) => setEditedItem({ ...editedItem, limit: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Sección de Enlaces a Documentos */}
            {editedItem.links && editedItem.links.length > 0 && (
              <div className="mt-4">
                <Separator className="mb-4" />
                <h3 className="mb-3 text-base font-medium">Enlaces a Documentos</h3>
                <div className="grid gap-3">
                  {editedItem.links.map((link, index) => (
                    <div key={link.id || index} className="flex items-center gap-3 rounded-md border p-3">
                      <div className="flex-1">
                        <div className="mb-2">
                          <Label htmlFor={`edit-link-title-${index}`}>Título</Label>
                          <Input
                            id={`edit-link-title-${index}`}
                            value={link.title}
                            onChange={(e) => {
                              const updatedLinks = [...editedItem.links!]
                              updatedLinks[index] = { ...link, title: e.target.value }
                              setEditedItem({ ...editedItem, links: updatedLinks })
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-link-url-${index}`}>URL</Label>
                          <Input
                            id={`edit-link-url-${index}`}
                            value={link.url}
                            onChange={(e) => {
                              const updatedLinks = [...editedItem.links!]
                              updatedLinks[index] = { ...link, url: e.target.value }
                              setEditedItem({ ...editedItem, links: updatedLinks })
                            }}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(link.url, "_blank")}
                        >
                          <ExternalLinkIcon className="h-4 w-4" />
                          <span className="sr-only">Abrir enlace</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            const updatedLinks = editedItem.links!.filter((_, i) => i !== index)
                            setEditedItem({ ...editedItem, links: updatedLinks })
                          }}
                        >
                          <XCircleIcon className="h-4 w-4" />
                          <span className="sr-only">Eliminar enlace</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sección de Autorizaciones */}
            {editedItem.authorizations && editedItem.authorizations.length > 0 && (
              <div className="mt-4">
                <Separator className="mb-4" />
                <h3 className="mb-3 text-base font-medium">Autorizaciones y Firmas</h3>
                <div className="grid gap-3">
                  {editedItem.authorizations.map((auth, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-md border p-3">
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`edit-auth-name-${index}`}>Nombre</Label>
                            <Input
                              id={`edit-auth-name-${index}`}
                              value={auth.name}
                              onChange={(e) => {
                                const updatedAuths = [...editedItem.authorizations!]
                                updatedAuths[index] = { ...auth, name: e.target.value }
                                setEditedItem({ ...editedItem, authorizations: updatedAuths })
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-auth-role-${index}`}>Rol</Label>
                            <Input
                              id={`edit-auth-role-${index}`}
                              value={auth.role}
                              onChange={(e) => {
                                const updatedAuths = [...editedItem.authorizations!]
                                updatedAuths[index] = { ...auth, role: e.target.value }
                                setEditedItem({ ...editedItem, authorizations: updatedAuths })
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-auth-status-${index}`}>Estado</Label>
                            <Select
                              value={auth.status}
                              onValueChange={(value) => {
                                const updatedAuths = [...editedItem.authorizations!]
                                updatedAuths[index] = {
                                  ...auth,
                                  status: value as "approved" | "rejected" | "pending",
                                  date: value !== "pending" ? new Date().toISOString().split("T")[0] : "",
                                }
                                setEditedItem({ ...editedItem, authorizations: updatedAuths })
                              }}
                            >
                              <SelectTrigger id={`edit-auth-status-${index}`} className="mt-1">
                                <SelectValue placeholder="Seleccionar estado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="approved">Aprobado</SelectItem>
                                <SelectItem value="rejected">Rechazado</SelectItem>
                                <SelectItem value="pending">Pendiente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`edit-auth-date-${index}`}>Fecha</Label>
                            <Input
                              id={`edit-auth-date-${index}`}
                              value={auth.date}
                              disabled={auth.status === "pending"}
                              onChange={(e) => {
                                const updatedAuths = [...editedItem.authorizations!]
                                updatedAuths[index] = { ...auth, date: e.target.value }
                                setEditedItem({ ...editedItem, authorizations: updatedAuths })
                              }}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
