"use client"

import type * as React from "react"
import {
  ArrowUpCircleIcon,
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

import { NavDocuments } from "./nav-documents"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
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
import { useAuth } from "@/contexts/auth-context"

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
              <a href="#">
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">Casa Monarca</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />

        {/* Opciones para administradores y superusuarios */}
        

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
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
