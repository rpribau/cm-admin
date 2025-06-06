"use client"

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEffect, useState } from "react"
import { z } from "zod"

// Define el esquema Zod para la forma de los datos
export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  limit_date: z.string(),
  reviewer: z.string(),
  target: z.string(),
  limit: z.string(),
  authorizations: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      status: z.string(),
      date: z.string(),
    }),
  ),
})

// Define el tipo de datos basado en el esquema Zod
export type Data = z.infer<typeof schema>

interface DataTableProps {
  columns: ColumnDef<Data>[]
  data: Data[]
}

export function DataTable({ columns, data: initialData }: DataTableProps) {
  const [data, setData] = useState<Data[]>(initialData)

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const handleUpdateSection = (id: number, updatedData: z.infer<typeof schema>) => {
    setData(data.map((item) => (item.id === id ? { ...item, ...updatedData } : item)))
  }

  const handleDeleteSection = (id: number) => {
    setData(data.filter((item) => item.id !== id))
  }

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
      // Las autorizaciones reales se crearán en el backend a través de add-section-form.tsx
      authorizations: [],
    }

    // Añadir el nuevo registro al principio de los datos
    setData([newSection, ...data])
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            return (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  return (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  )
                })}
              </TableRow>
            )
          })}
          {table.getFilteredRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}
