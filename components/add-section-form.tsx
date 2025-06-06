"use client"

import * as React from "react"
import { CalendarIcon, Loader2, UploadIcon, FileIcon, Trash2Icon, CheckIcon } from "lucide-react"
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
import { useAuth } from "@/contexts/auth-provider"
import { accountDetailsApi, documentUploadApi, type AccountDetailsResponse } from "@/lib/api-service"
import { Textarea } from "@/components/ui/textarea"
import { autorizacionApi, type AutorizacionModel } from "@/lib/api-service"

// Esquema para validación
const sectionSchema = z.object({
  header: z.string().min(2, {
    message: "El encabezado debe tener al menos 2 caracteres.",
  }),
  type: z.string(),
  limit_date: z.string(),
  reviewer: z.string(),
  description: z.string().optional(),
  target: z.number().min(1, "El objetivo debe ser mayor a 0"),
  limit: z.number().min(1, "El límite debe ser mayor a 0"),
  files: z.array(z.instanceof(File)).optional(),
})

type FormData = z.infer<typeof sectionSchema>

interface AddSectionFormProps {
  onAddSection: (data: FormData) => void
  onSuccess: () => void
}

export function AddSectionForm({ onAddSection, onSuccess }: AddSectionFormProps) {
  const { userType } = useAuth()
  const [formData, setFormData] = React.useState<FormData>({
    header: "",
    type: userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : "Humanitario",
    limit_date: new Date().toISOString().split("T")[0],
    reviewer: "Asignar revisor",
    description: "",
    target: 1,
    limit: 1,
    files: [],
  })
  const [loading, setLoading] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [uploadingFiles, setUploadingFiles] = React.useState<string[]>([])

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
  }, [formData.type])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const pdfFiles = files.filter((file) => file.type === "application/pdf")

    if (pdfFiles.length !== files.length) {
      toast.error("Solo se permiten archivos PDF")
      return
    }

    setFormData((prev) => ({
      ...prev,
      files: [...(prev.files || []), ...pdfFiles],
    }))
  }

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files?.filter((_, i) => i !== index) || [],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updatedFormData = {
        ...formData,
        limit_date: date ? date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      }

      // Obtener usuarios autorizados para este tipo de documento
      let authorizedUsers: AccountDetailsResponse[] = []
      try {
        // Obtener todos los usuarios con autorización para este tipo
        const allUsers = await accountDetailsApi.getAll()
        authorizedUsers = allUsers.filter(
          (user) =>
            user.authorizacion === true &&
            (user.type.toLowerCase() === updatedFormData.type.toLowerCase() ||
              user.type.toLowerCase().includes(updatedFormData.type.toLowerCase())),
        )

        console.log(`Encontrados ${authorizedUsers.length} usuarios autorizados para tipo ${updatedFormData.type}`)
      } catch (error) {
        console.error("Error al obtener usuarios autorizados:", error)
      }

      // Si hay archivos, usar el endpoint de subir documento
      if (updatedFormData.files && updatedFormData.files.length > 0) {
        setUploadingFiles(updatedFormData.files.map((file) => file.name))

        for (const file of updatedFormData.files) {
          try {
            // Crear el documento con las autorizaciones de usuarios reales
            const documentData = {
              header: `${updatedFormData.header} - ${file.name}`,
              type: updatedFormData.type,
              status: "No Iniciado",
              target: updatedFormData.target,
              limit: updatedFormData.limit,
              limit_date: updatedFormData.limit_date,
              reviewer: updatedFormData.reviewer,
              description: updatedFormData.description || "",
            }

            const createdDoc = await documentUploadApi.uploadDocument(file, documentData)

            // Crear autorizaciones para este documento si hay usuarios autorizados
            if (authorizedUsers.length > 0 && createdDoc && createdDoc.id) {
              // Verificar si ya existen autorizaciones para este documento
              let existingAuths: AutorizacionModel[] = []
              try {
                existingAuths = await autorizacionApi.getByDocumentoId(createdDoc.id)
              } catch (error) {
                console.error("Error al verificar autorizaciones existentes:", error)
              }

              // Crear solo las autorizaciones que no existen
              for (const user of authorizedUsers) {
                // Verificar si este usuario ya tiene una autorización para este documento
                const authExists = existingAuths.some((auth) => auth.name === user.name)

                if (!authExists) {
                  try {
                    await autorizacionApi.create({
                      documento_id: createdDoc.id,
                      name: user.name,
                      role: `Autorización ${updatedFormData.type}`,
                      status: "pending",
                      date: null,
                    })
                  } catch (authError) {
                    console.error(`Error al crear autorización para usuario ${user.name}:`, authError)
                  }
                }
              }
            }

            setUploadingFiles((prev) => prev.filter((name) => name !== file.name))
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error)
            toast.error(`Error al subir ${file.name}`)
            setUploadingFiles((prev) => prev.filter((name) => name !== file.name))
          }
        }
      } else {
        // Si no hay archivos, crear documento sin archivos
        const documentData = {
          header: updatedFormData.header,
          type: updatedFormData.type,
          status: "No Iniciado",
          target: updatedFormData.target,
          limit: updatedFormData.limit,
          limit_date: updatedFormData.limit_date,
          reviewer: updatedFormData.reviewer,
          description: updatedFormData.description || "",
        }

        const createdDoc = await documentUploadApi.uploadDocument(new File([], ""), documentData)

        // Crear autorizaciones para este documento si hay usuarios autorizados
        if (authorizedUsers.length > 0 && createdDoc && createdDoc.id) {
          // Verificar si ya existen autorizaciones para este documento
          let existingAuths: AutorizacionModel[] = []
          try {
            existingAuths = await autorizacionApi.getByDocumentoId(createdDoc.id)
          } catch (error) {
            console.error("Error al verificar autorizaciones existentes:", error)
          }

          // Crear solo las autorizaciones que no existen
          for (const user of authorizedUsers) {
            // Verificar si este usuario ya tiene una autorización para este documento
            const authExists = existingAuths.some((auth) => auth.name === user.name)

            if (!authExists) {
              try {
                await autorizacionApi.create({
                  documento_id: createdDoc.id,
                  name: user.name,
                  role: `Autorización ${updatedFormData.type}`,
                  status: "pending",
                  date: null,
                })
              } catch (authError) {
                console.error(`Error al crear autorización para usuario ${user.name}:`, authError)
              }
            }
          }
        }
      }

      onAddSection(updatedFormData)
      onSuccess() // Llamar a la función de éxito
    } catch (error) {
      console.error("Error al crear documento:", error)
      toast.error("Error al crear la sección")
    } finally {
      setLoading(false)
      setUploadingFiles([])
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
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
          onValueChange={(value) => setFormData({ ...formData, type: value, reviewer: "Asignar revisor" })}
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          <Label htmlFor="target" className="flex items-center">
            Objetivo <span className="ml-1 text-red-500">*</span>
          </Label>
          <Input
            id="target"
            type="number"
            min="1"
            value={formData.target}
            onChange={(e) => setFormData({ ...formData, target: Number.parseInt(e.target.value) || 1 })}
            required
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor="limit" className="flex items-center">
            Límite <span className="ml-1 text-red-500">*</span>
          </Label>
          <Input
            id="limit"
            type="number"
            min="1"
            value={formData.limit}
            onChange={(e) => setFormData({ ...formData, limit: Number.parseInt(e.target.value) || 1 })}
            required
          />
        </div>
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
        <Label className="text-base font-medium">Subir archivos (PDF)</Label>
        <p className="text-sm text-muted-foreground">Sube archivos PDF que se almacenarán en el sistema.</p>

        {formData.files && formData.files.length > 0 && (
          <Card className="mb-3">
            <CardContent className="p-3">
              <div className="flex flex-col gap-2">
                {formData.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 rounded-md border p-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileIcon className="h-4 w-4 shrink-0 text-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {uploadingFiles.includes(file.name) ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Subiendo...</span>
                        </div>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4 text-green-500" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeFile(index)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                            <span className="sr-only">Eliminar archivo</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 rounded-md border p-3">
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 p-6 text-center hover:border-muted-foreground/50">
              <UploadIcon className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Haz clic para subir archivos PDF</p>
                <p className="text-sm text-muted-foreground">o arrastra y suelta aquí</p>
              </div>
            </div>
          </Label>
          <Input id="file-upload" type="file" accept=".pdf" multiple onChange={handleFileChange} className="hidden" />
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
