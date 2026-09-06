"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertCircle,
  Copy,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Users,
} from "lucide-react"

import { DashboardTabs } from "@/components/dashboard-tabs"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  createMatrone,
  deleteMatrone,
  fetchAlerts,
  fetchMatrones,
  fetchStats,
  resetMatronePassword,
  updateMatrone,
} from "@/lib/api-client"
import { formatDate } from "@/lib/pregnancy"
import type { DashboardStats, MatroneAccount, SystemAlert } from "@/lib/types"

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Identifiants provisoires affichés une seule fois, à transmettre hors ligne. */
interface IssuedCredentials {
  name: string
  email: string
  password: string
}

export function AdminDashboard() {
  const [matrones, setMatrones] = useState<MatroneAccount[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isNewMatroneOpen, setIsNewMatroneOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MatroneAccount | null>(null)

  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      const [nextMatrones, nextStats, nextAlerts] = await Promise.all([fetchMatrones(), fetchStats(), fetchAlerts()])
      setMatrones(nextMatrones)
      setStats(nextStats)
      setAlerts(nextAlerts)
    } catch (err) {
      toast({ title: "Chargement impossible", description: describe(err) })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const regionalData = useMemo(() => {
    const byRegion = new Map<string, { region: string; matrones: number; patients: number }>()

    for (const matrone of matrones) {
      const entry = byRegion.get(matrone.region) ?? { region: matrone.region, matrones: 0, patients: 0 }
      entry.matrones += 1
      entry.patients += matrone.patients
      byRegion.set(matrone.region, entry)
    }

    const rows = [...byRegion.values()].sort(
      (a, b) => b.patients - a.patients || a.region.localeCompare(b.region, "fr"),
    )
    const busiest = Math.max(1, ...rows.map((row) => row.patients))

    return rows.map((row) => ({ ...row, share: Math.round((row.patients / busiest) * 100) }))
  }, [matrones])

  const toggleAccount = async (matrone: MatroneAccount) => {
    const nextState = !matrone.isActive
    setMatrones((prev) => prev.map((m) => (m.id === matrone.id ? { ...m, isActive: nextState } : m)))

    try {
      const updated = await updateMatrone(matrone.id, { isActive: nextState })
      setMatrones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      toast({
        title: nextState ? "Compte activé" : "Compte désactivé",
        description: nextState
          ? `${updated.name} peut à nouveau se connecter.`
          : `${updated.name} a été déconnectée de toutes ses sessions.`,
      })
    } catch (err) {
      setMatrones((prev) => prev.map((m) => (m.id === matrone.id ? { ...m, isActive: matrone.isActive } : m)))
      toast({ title: "Erreur", description: describe(err) })
    }
  }

  const handleCreateMatrone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    setIsSubmitting(true)
    try {
      const { matrone, temporaryPassword } = await createMatrone({
        name: (formData.get("name") as string).trim(),
        email: (formData.get("email") as string).trim(),
        region: (formData.get("region") as string).trim(),
        phone: ((formData.get("phone") as string) || "").trim() || null,
      })

      setMatrones((prev) => [...prev, matrone])
      setStats((prev) =>
        prev ? { ...prev, totalMatrones: prev.totalMatrones + 1, activeMatrones: prev.activeMatrones + 1 } : prev,
      )
      form.reset()
      setIsNewMatroneOpen(false)
      setCredentials({ name: matrone.name, email: matrone.email, password: temporaryPassword })
    } catch (err) {
      toast({ title: "Création impossible", description: describe(err) })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (matrone: MatroneAccount) => {
    try {
      const { temporaryPassword } = await resetMatronePassword(matrone.id)
      setMatrones((prev) => prev.map((m) => (m.id === matrone.id ? { ...m, mustChangePassword: true } : m)))
      setCredentials({ name: matrone.name, email: matrone.email, password: temporaryPassword })
    } catch (err) {
      toast({ title: "Réinitialisation impossible", description: describe(err) })
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return

    try {
      await deleteMatrone(pendingDelete.id)
      setMatrones((prev) => prev.filter((m) => m.id !== pendingDelete.id))
      toast({ title: "Compte supprimé", description: `${pendingDelete.name} n'a plus accès à la plateforme.` })
      await loadData()
    } catch (err) {
      toast({ title: "Suppression impossible", description: describe(err) })
    } finally {
      setPendingDelete(null)
    }
  }

  const copyCredentials = async () => {
    if (!credentials) return
    try {
      await navigator.clipboard.writeText(`${credentials.email} / ${credentials.password}`)
      toast({ title: "Copié", description: "Identifiants copiés dans le presse-papiers." })
    } catch {
      toast({ title: "Copie impossible", description: "Notez les identifiants manuellement." })
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <DashboardTabs
          tabs={[
            { value: "overview", label: "Réseau", icon: LayoutDashboard },
            { value: "matrones", label: "Comptes", icon: ShieldCheck },
            { value: "alerts", label: "Alertes", icon: AlertCircle, badge: alerts.length },
          ]}
        />

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <ShieldCheck className="w-8 h-8 text-primary mb-2" />
                <div className="text-2xl font-bold">
                  {isLoading ? "…" : `${stats?.activeMatrones ?? 0}/${stats?.totalMatrones ?? 0}`}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
                  Matrones actives
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/5 border-secondary/20 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Users className="w-8 h-8 text-secondary-foreground mb-2" />
                <div className="text-2xl font-bold">{isLoading ? "…" : (stats?.totalPatients ?? 0)}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Patientes</div>
              </CardContent>
            </Card>
            <Card className="bg-accent/5 border-accent/20 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Stethoscope className="w-8 h-8 text-accent-foreground mb-2" />
                <div className="text-2xl font-bold">{isLoading ? "…" : (stats?.consultationsThisMonth ?? 0)}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
                  Consultations ce mois
                </div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Activity className="w-8 h-8 text-destructive mb-2" />
                <div className="text-2xl font-bold text-destructive">
                  {isLoading ? "…" : (stats?.patientsUnderWatch ?? 0)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
                  Sous surveillance
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Distribution Régionale</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {regionalData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun compte matrone pour le moment. Créez-en un dans l'onglet « Comptes ».
                </p>
              ) : (
                <div className="space-y-4">
                  {regionalData.map((region) => (
                    <div key={region.region} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="font-medium">{region.region}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            {region.matrones} matrone{region.matrones > 1 ? "s" : ""}
                          </Badge>
                          <span className="text-muted-foreground">{region.patients} patientes</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${region.share}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrones" className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-bold tracking-tight">Comptes Matrones</h3>
            <Button size="sm" className="gap-2 rounded-xl px-4" onClick={() => setIsNewMatroneOpen(true)}>
              <Plus className="w-4 h-4" /> Nouvelle Matrone
            </Button>
          </div>

          {isLoading ? (
            <p className="px-1 text-sm text-muted-foreground">Chargement des comptes…</p>
          ) : matrones.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="font-medium">Aucun compte matrone</p>
                <p className="text-sm text-muted-foreground">
                  Créez le premier compte pour que les matrones puissent suivre leurs patientes.
                </p>
                <Button className="gap-2" onClick={() => setIsNewMatroneOpen(true)}>
                  <Plus className="w-4 h-4" /> Nouvelle matrone
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {matrones.map((matrone) => (
                <Card key={matrone.id} className="group hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 shrink-0 rounded-2xl bg-muted flex items-center justify-center font-bold text-primary text-xl">
                        {matrone.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-lg truncate">{matrone.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{matrone.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {matrone.region} · {matrone.patients} patiente{matrone.patients > 1 ? "s" : ""}
                          {matrone.phone ? ` · ${matrone.phone}` : ""}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant={matrone.isActive ? "secondary" : "outline"} className="font-bold">
                            {matrone.isActive ? "ACTIF" : "DÉSACTIVÉ"}
                          </Badge>
                          {matrone.mustChangePassword && (
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-800"
                            >
                              Mot de passe provisoire
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {matrone.lastLoginAt
                              ? `Dernière connexion le ${formatDate(matrone.lastLoginAt)}`
                              : "Jamais connectée"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Réinitialiser le mot de passe"
                        onClick={() => handleResetPassword(matrone)}
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Supprimer le compte"
                        className="text-destructive"
                        onClick={() => setPendingDelete(matrone)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={matrone.isActive}
                        onCheckedChange={() => toggleAccount(matrone)}
                        aria-label={`Activer le compte de ${matrone.name}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-bold tracking-tight">Alertes de suivi</h3>
            <Button variant="outline" size="sm" onClick={loadData}>
              Actualiser
            </Button>
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Ces alertes sont recalculées à chaque consultation de la page à partir des dossiers réels : constantes hors
            seuils, rendez-vous passés non clôturés et suivis sans consultation depuis plus de 60 jours.
          </p>

          {isLoading ? (
            <p className="px-1 text-sm text-muted-foreground">Chargement…</p>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 mx-auto mb-4 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-lg font-medium">Aucune alerte en cours</p>
                <p className="text-sm text-muted-foreground">Tous les suivis sont à jour.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`border-l-4 ${alert.severity === "error" ? "border-l-destructive" : "border-l-orange-400"}`}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        alert.severity === "error"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300"
                      }`}
                    >
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold leading-tight">{alert.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">{alert.detail}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isNewMatroneOpen} onOpenChange={setIsNewMatroneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une Matrone</DialogTitle>
            <DialogDescription>
              Un mot de passe provisoire sera généré. La matrone devra le changer à sa première connexion.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMatrone} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matrone-name">Nom complet *</Label>
              <Input id="matrone-name" name="name" required placeholder="Ex: Fatou Koné" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matrone-email">Email professionnel *</Label>
              <Input id="matrone-email" name="email" type="email" required placeholder="matrone@structure.ci" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matrone-region">Région / district *</Label>
              <Input id="matrone-region" name="region" required placeholder="Ex: Abidjan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matrone-phone">Téléphone</Label>
              <Input id="matrone-phone" name="phone" type="tel" placeholder="+225 07 12 34 56 78" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewMatroneOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Création…" : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={credentials !== null} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Identifiants de {credentials?.name}</DialogTitle>
            <DialogDescription>
              Ce mot de passe n'est affiché qu'une seule fois : il n'est stocké que sous forme hachée. Transmettez-le
              par un canal sûr.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
            <div className="break-all">{credentials?.email}</div>
            <div className="text-lg font-bold tracking-wider break-all">{credentials?.password}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="gap-2" onClick={copyCredentials}>
              <Copy className="w-4 h-4" />
              Copier
            </Button>
            <Button onClick={() => setCredentials(null)}>J'ai noté</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le compte de {pendingDelete?.name} ?</DialogTitle>
            <DialogDescription>
              L'accès est définitivement supprimé. Un compte suivant encore des patientes ne peut pas être supprimé :
              désactivez-le ou réaffectez ses dossiers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
