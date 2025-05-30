"use client"

import * as React from "react"
import { CalendarIcon, Loader2, LinkIcon, PlusIcon, Trash2Icon, ExternalLinkIcon } from "lucide-react"
import { es } from "date-fns/locale"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SheetClose, SheetFooter } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { accountDetailsApi, documentoCompletoApi, type AccountDetailsResponse } from "@/lib/api-service"
import { Textarea } from "@/components/ui/textarea"

// Esquema para validación
const sectionSchema = z.object({
  header: z.string().min(2, {
    message: "El encabezado debe tener al menos 2 caracteres.",
  }),
  type: z.string(),
  limit_date: z.string(),
  reviewer: z.string(),
  description: z.string().optional(),
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
  const { userType } = useAuth()
  const [formData, setFormData] = React.useState<FormData>({
    header: "",
    type: userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : "Humanitario",
    limit_date: new Date().toISOString().split("T")[0],
    reviewer: "Asignar revisor",
    description: "",
    links: [],
  })
  const [loading, setLoading] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  const [newLink, setNewLink] = React.useState<Omit<LinkItem, "id">>({
    title: "",
    url: "",
  })
  const [linkErrors, setLinkErrors] = React.useState({
    title: false,
    url: false,
  })

  const [reviewers, setReviewers] = React.useState<AccountDetailsResponse[]>([])
  const [loadingReviewers, setLoadingReviewers] = React.useState(true)

  React.useEffect(() => {
    const fetchReviewers = async () => {
      setLoadingReviewers(true)
      try {
        const allUsers = await accountDetailsApi.getAll()
        const potentialReviewers = allUsers.filter(
          (acc) => acc.authorizacion === true && acc.type.toLowerCase() === formData.type.toLowerCase(),
        )
        setReviewers(potentialReviewers)

        if (formData.reviewer !== "Asignar revisor" && !potentialReviewers.find((r) => r.name === formData.reviewer)) {
          setFormData((prev) => ({ ...prev, reviewer: "Asignar revisor" }))
        }
      } catch (error) {
        console.error("Error fetching reviewers:", error)
        toast.error("Error al cargar la lista de revisores.")
        setReviewers([])
      } finally {
        setLoadingReviewers(false)
      }
    }

    if (formData.type) {
      fetchReviewers()
    }
  }, [formData.type]) // Re-fetch/filter when document type changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updatedFormData = {
        ...formData,
        limit_date: date ? date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      }

      const apiDocument = documentoCompletoApi.mapToApiFormat({
        id: null,
        ...updatedFormData,
        status: "No Iniciado",
        // description is already in updatedFormData
        authorizations: [
          { name: "Carlos Méndez", role: "Director de Proyecto", status: "pending", date: "" },
          { name: "María García", role: "Gerente de Calidad", status: "pending", date: "" },
          { name: "Laura Sánchez", role: "Directora Financiera", status: "pending", date: "" },
        ],
      })

      await documentoCompletoApi.create(apiDocument)
      onAddSection(updatedFormData)
      toast.success("Sección añadida correctamente")
    } catch (error) {
      console.error("Error al crear documento:", error)
      toast.error("Error al crear la sección")
    } finally {
      setLoading(false)
    }
  }

  const addLink = () => {
    const titleError = newLink.title.trim() === ""
    const urlError = newLink.url.trim() === "" || !isValidUrl(newLink.url)
    setLinkErrors({ title: titleError, url: urlError })
    if (titleError || urlError) return

    const link: LinkItem = { id: crypto.randomUUID(), title: newLink.title, url: newLink.url }
    setFormData({ ...formData, links: [...(formData.links || []), link] })
    setNewLink({ title: "", url: "" })
    setLinkErrors({ title: false, url: false })
  }

  const removeLink = (id: string) => {
    setFormData({ ...formData, links: formData.links?.filter((link) => link.id !== id) || [] })
  }

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
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value, reviewer: "Asignar revisor" })} // Reset reviewer on type change
          required
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="Seleccionar tipo" />
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
        <Select
          value={formData.reviewer}
          onValueChange={(value) => setFormData({ ...formData, reviewer: value })}
          disabled={loadingReviewers}
        >
          <SelectTrigger id="reviewer">
            <SelectValue placeholder="Asignar revisor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Asignar revisor">Asignar revisor</SelectItem>
            {loadingReviewers ? (
              <SelectItem value="loading" disabled>
                Cargando revisores...
              </SelectItem>
            ) : reviewers.length === 0 ? (
              <SelectItem value="no-reviewers" disabled>
                No hay revisores para este tipo
              </SelectItem>
            ) : (
              reviewers.map((rev) => (
                <SelectItem key={rev.id} value={rev.name}>
                  {rev.name} ({rev.email})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Añade una descripción detallada del documento..."
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-[100px]"
        />
      </div>

      <Separator className="my-2" />

      <div className="flex flex-col gap-3">
        <Label className="text-base font-medium">Enlaces a documentos</Label>
        <p className="text-sm text-muted-foreground">
          Añade enlaces a documentos almacenados en SharePoint o OneDrive.
        </p>

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
