"use client"

import type * as React from "react"
import {
  BarChartIcon,
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  PenToolIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import Image from "next/image"

import { NavDocuments } from "./nav-documents"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-provider"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Analítica",
      url: "#",
      icon: BarChartIcon,
    },
    {
      title: "Proyectos",
      url: "#",
      icon: FolderIcon,
    },
    {
      title: "Equipo",
      url: "#",
      icon: UsersIcon,
    },
  ],
  navClouds: [
    {
      title: "Captura",
      icon: CameraIcon,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Propuestas Activas",
          url: "#",
        },
        {
          title: "Archivadas",
          url: "#",
        },
      ],
    },
    {
      title: "Propuesta",
      icon: FileTextIcon,
      url: "#",
      items: [
        {
          title: "Propuestas Activas",
          url: "#",
        },
        {
          title: "Archivadas",
          url: "#",
        },
      ],
    },
    {
      title: "Indicaciones",
      icon: FileCodeIcon,
      url: "#",
      items: [
        {
          title: "Propuestas Activas",
          url: "#",
        },
        {
          title: "Archivadas",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Configuración",
      url: "#",
      icon: SettingsIcon,
    },
  ],
  documents: [
    {
      name: "Biblioteca de Datos",
      url: "#",
      icon: DatabaseIcon,
    },
    {
      name: "Informes",
      url: "#",
      icon: ClipboardListIcon,
    },
    {
      name: "Asistente de Texto",
      url: "#",
      icon: FileIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isSuperuser, isAdmin } = useAuth()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/dashboard" className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center">
                  <Image src="/casa-monarca.ico" alt="Casa Monarca" width={140} height={102} className="h-102 w-140" />
                </div>
                <span className="text-base font-semibold">Casa Monarca</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />


        {/* Opción "Crear firmas" solo visible para superusuarios */}
        {isSuperuser && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="/dashboard/firmas">
                  <PenToolIcon className="h-4 w-4" />
                  <span>Crear firmas</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
