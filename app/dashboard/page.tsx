"use client"

import { useEffect, useState } from "react"
import { DataTable } from "../../components/data-table"
import { SectionCards } from "../../components/section-cards"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

import data from "./data.json"

export default function Page() {
  const { user, userType, isLoading } = useAuth()
  const [filteredData, setFilteredData] = useState(data)

  // Filtrar los datos según el tipo de usuario
  useEffect(() => {
    if (user && userType) {
      // Si no es "todos", filtrar por el tipo de usuario
      if (userType !== "todos") {
        const filtered = data.filter((item) => item.type.toLowerCase() === userType.toLowerCase())
        setFilteredData(filtered)
      } else {
        setFilteredData(data)
      }
    }
  }, [user, userType])

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <DataTable data={filteredData} />
    </div>
  )
}
