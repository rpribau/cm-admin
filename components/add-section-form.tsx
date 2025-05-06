"use client"

import * as React from "react"
import { CalendarIcon, Loader2, LinkIcon, PlusIcon, Trash2Icon, ExternalLinkIcon } from "lucide-react"
import { es } from "date-fns/locale"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SheetClose, SheetFooter } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-provider"

// Esquema para validación
const sectionSchema = z.object({
  header: z.string().min(2, {
    message: "El encabezado debe tener al menos 2 caracteres.",
  }),
  type: z.string(),
  limit_date: z.string(),
  reviewer: z.string(),
  links: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        url: z.string().url("La URL no es válida"),
      }),
    )
    .optional(),
})

// Definir el tipo para un enlace
interface LinkItem {
  id: string
  title: string
  url: string
}

type FormData = z.infer<typeof sectionSchema>

interface AddSectionFormProps {
  onAddSection: (data: FormData) => void
}

export function AddSectionForm({ onAddSection }: AddSectionFormProps) {
  const { user, userType } = useAuth()
  const [formData, setFormData] = React.useState<FormData>({
    header: "",
    type: userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : "Humanitario",
    limit_date: new Date().toISOString().split("T")[0],
    reviewer: "Asignar revisor",
    links: [],
  })
  const [loading, setLoading] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  // Estado para el nuevo enlace que se está agregando
  const [newLink, setNewLink] = React.useState<Omit<LinkItem, "id">>({
    title: "",
    url: "",
  })

  // Estado para controlar errores de validación
  const [linkErrors, setLinkErrors] = React.useState({
    title: false,
    url: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Actualizar la fecha límite con el valor del calendario
    const updatedFormData = {
      ...formData,
      limit_date: date ? date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    }

    // Simular un tiempo de carga
    setTimeout(() => {
      onAddSection(updatedFormData)
      setLoading(false)
    }, 500)
  }

  // Función para agregar un nuevo enlace
  const addLink = () => {
    // Validar que el título y la URL no estén vacíos
    const titleError = newLink.title.trim() === ""
    const urlError = newLink.url.trim() === "" || !isValidUrl(newLink.url)

    setLinkErrors({
      title: titleError,
      url: urlError,
    })

    if (titleError || urlError) return

    // Crear un nuevo enlace con un ID único
    const link: LinkItem = {
      id: crypto.randomUUID(),
      title: newLink.title,
      url: newLink.url,
    }

    // Actualizar el estado del formulario
    setFormData({
      ...formData,
      links: [...(formData.links || []), link],
    })

    // Limpiar el formulario de nuevo enlace
    setNewLink({
      title: "",
      url: "",
    })

    // Limpiar errores
    setLinkErrors({
      title: false,
      url: false,
    })
  }

  // Función para eliminar un enlace
  const removeLink = (id: string) => {
    setFormData({
      ...formData,
      links: formData.links?.filter((link) => link.id !== id) || [],
    })
  }

  // Función para validar URL
  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch (e) {
      return false
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
      <div className="flex flex-col gap-3">
        <Label htmlFor="header" className="flex items-center">
          Encabezado <span className="ml-1 text-red-500">*</span>
        </Label>
        <Input
          id="header"
          value={formData.header}
          onChange={(e) => setFormData({ ...formData, header: e.target.value })}
          required
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="type" className="flex items-center">
          Tipo <span className="ml-1 text-red-500">*</span>
        </Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })} required>
          <SelectTrigger id="type">
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            {(!userType || userType === "humanitario") && <SelectItem value="Humanitario">Humanitario</SelectItem>}
            {(!userType || userType === "psicosocial") && <SelectItem value="Psicosocial">Psicosocial</SelectItem>}
            {(!userType || userType === "legal") && <SelectItem value="Legal">Legal</SelectItem>}
            {(!userType || userType === "comunicacion") && <SelectItem value="Comunicación">Comunicación</SelectItem>}
            {(!userType || userType === "almacen") && <SelectItem value="Almacén">Almacén</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="limit_date" className="flex items-center">
          Fecha Límite <span className="ml-1 text-red-500">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? date.toLocaleDateString() : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="reviewer">Revisor</Label>
        <Select value={formData.reviewer} onValueChange={(value) => setFormData({ ...formData, reviewer: value })}>
          <SelectTrigger id="reviewer">
            <SelectValue placeholder="Asignar revisor" />
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

      {/* Nueva sección para enlaces a SharePoint/OneDrive */}
      <Separator className="my-2" />

      <div className="flex flex-col gap-3">
        <Label className="text-base font-medium">Enlaces a documentos</Label>
        <p className="text-sm text-muted-foreground">
          Añade enlaces a documentos almacenados en SharePoint o OneDrive.
        </p>

        {/* Lista de enlaces existentes */}
        {formData.links && formData.links.length > 0 && (
          <Card className="mb-3">
            <CardContent className="p-3">
              <div className="flex flex-col gap-2">
                {formData.links.map((link) => (
                  <div key={link.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{link.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(link.url, "_blank")}
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                        <span className="sr-only">Abrir enlace</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeLink(link.id)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                        <span className="sr-only">Eliminar enlace</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulario para agregar nuevo enlace */}
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="link-title" className={linkErrors.title ? "text-destructive" : ""}>
              Título del documento
            </Label>
            <Input
              id="link-title"
              placeholder="Informe mensual, Presupuesto, etc."
              value={newLink.title}
              onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
              className={linkErrors.title ? "border-destructive" : ""}
            />
            {linkErrors.title && <p className="text-xs text-destructive">El título es obligatorio</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="link-url" className={linkErrors.url ? "text-destructive" : ""}>
              URL del documento (SharePoint/OneDrive)
            </Label>
            <Input
              id="link-url"
              placeholder="https://organizacion-my.sharepoint.com/..."
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className={linkErrors.url ? "border-destructive" : ""}
            />
            {linkErrors.url && <p className="text-xs text-destructive">Introduce una URL válida</p>}
          </div>

          <Button type="button" variant="outline" className="mt-1 w-full" onClick={addLink}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Añadir enlace
          </Button>
        </div>
      </div>

      <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
        <Button type="submit" disabled={loading || !formData.header}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar"
          )}
        </Button>
        <SheetClose asChild>
          <Button variant="outline" type="button">
            Cancelar
          </Button>
        </SheetClose>
      </SheetFooter>
    </form>
  )
}
