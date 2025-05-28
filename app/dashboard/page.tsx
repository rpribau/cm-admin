"use client"

import { useEffect, useState } from "react"
import { DataTable } from "../../components/data-table"
import { SectionCards } from "../../components/section-cards"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function Page() {
  const { user, userType, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState([])
  const [error, setError] = useState(null)

  // Cargar datos desde la API
  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return

      setIsLoading(true)
      try {
        const response = await fetch("/api/documents")

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        const documents = await response.json()

        // Filtrar por tipo de usuario si es necesario
        if (user && userType && userType !== "todos") {
          const filtered = documents.filter((item) => item.type.toLowerCase() === userType.toLowerCase())
          setData(filtered)
        } else {
          setData(documents)
        }

        setError(null)
      } catch (err) {
        console.error("Error fetching documents:", err)
        setError("Error al cargar los documentos")
        toast.error("Error al cargar los documentos")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, userType, authLoading])

  // Mostrar pantalla de carga mientras se verifica la autenticación o se cargan los datos
  if (isLoading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Mostrar mensaje de error si hay algún problema
  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground">Por favor, intenta recargar la página o contacta con soporte.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <DataTable data={data} />
    </div>
  )
}
