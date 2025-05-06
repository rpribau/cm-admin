"use client"

import type React from "react"

import { AuthProvider } from "@/contexts/auth-context"

export function AuthContextWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
