"use client"

import type { LucideIcon } from "lucide-react"

import { TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface DashboardTab {
  value: string
  label: string
  icon: LucideIcon
  /** Pastille de comptage (messages non lus, alertes en cours). */
  badge?: number
}

/**
 * Navigation des espaces, adaptée au support.
 *
 * Sur téléphone — le support principal des matrones sur le terrain — elle prend
 * la forme d'une barre fixe en bas de l'écran, avec des cibles tactiles hautes de
 * 56 px et une icône par entrée : quatre onglets textuels côte à côte étaient
 * illisibles et trop serrés pour le pouce. Sur écran large, elle redevient une
 * barre d'onglets classique.
 */
export function DashboardTabs({ tabs }: { tabs: DashboardTab[] }) {
  return (
    <TabsList
        className="
          fixed inset-x-0 bottom-0 z-40 grid h-auto w-full rounded-none border-t bg-card p-0
          pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.06)]
          md:static md:h-12 md:rounded-xl md:border-0 md:bg-muted/50 md:p-1 md:shadow-none
        "
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="
              relative h-14 flex-col gap-1 rounded-none text-[11px] font-semibold
              data-[state=active]:bg-transparent data-[state=active]:text-primary
              data-[state=active]:shadow-none
              md:h-full md:flex-row md:gap-2 md:rounded-lg md:text-sm md:font-bold
              md:data-[state=active]:bg-background md:data-[state=active]:text-foreground
              md:data-[state=active]:shadow-sm
            "
          >
            <span className="relative">
              <tab.icon className="w-5 h-5 md:hidden" />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground md:hidden">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </span>
            <span>
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="hidden md:inline"> ({tab.badge})</span>
              )}
            </span>
          </TabsTrigger>
      ))}
    </TabsList>
  )
}
