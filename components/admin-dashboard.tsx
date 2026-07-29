"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MOCK_STATS, MOCK_SYSTEM_ALERTS } from "@/lib/mock-data"
import { loadMatroneAccounts, saveMatroneAccounts } from "@/lib/storage"
import type { MatroneAccount } from "@/lib/types"
import {
  Users,
  ShieldCheck,
  BellRing,
  Activity,
  Plus,
  ArrowRight,
  AlertCircle,
  FileBarChart,
  ClipboardList,
  MapPin,
  Download,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function AdminDashboard() {
  const [matrones, setMatrones] = useState<MatroneAccount[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [alerts, setAlerts] = useState(MOCK_SYSTEM_ALERTS)
  const [isNewMatroneDialogOpen, setIsNewMatroneDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Load from localStorage as fallback, then sync with backend
    setMatrones(loadMatroneAccounts())
    setIsLoaded(true)

    // fetch real data from API (if available)
    ;(async () => {
      try {
        const res = await fetch('/api/matrones')
        if (res.ok) {
          const json = await res.json()
          if (json?.success && Array.isArray(json.data)) {
          setMatrones(json.data as MatroneAccount[])
          }
        }
      } catch (err) {
        // network error -> keep local data
        console.warn('Could not fetch matrones from API', err)
      }
    })()
  }, [])

  useEffect(() => {
    if (isLoaded) {
      saveMatroneAccounts(matrones)
    }
  }, [matrones, isLoaded])

  const toggleMatroneStatus = async (id: string) => {
    const updated = matrones.map((m) =>
      m.id === id
        ? {
            ...m,
            status: m.status === "active" ? "inactive" : "active",
            lastActive: m.status === "active" ? "Maintenant" : "Il y a quelques instants",
          }
        : m,
    )
    setMatrones(updated as MatroneAccount[])

    try {
      const target = updated.find((m) => m.id === id)
      const res = await fetch(`/api/matrones/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: target?.status, lastActive: target?.lastActive }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.message || 'API error')
      toast({ title: 'Statut modifié', description: `${json.data.name} est maintenant ${json.data.status}` })
    } catch (err) {
      // rollback on error
      setMatrones(loadMatroneAccounts())
      toast({ title: 'Erreur', description: `Impossible de modifier le statut: ${(err as any)?.message ?? String(err)}` })
    }
  }

  const markAllAlertsAsRead = () => {
    setAlerts([])
    toast({
      title: "Alertes marquées comme lues",
      description: "Toutes les alertes ont été marquées comme lues",
    })
  }

  const resolveAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    toast({
      title: "Alerte résolue",
      description: "L'alerte a été traitée avec succès",
    })
  }

  const handleCreateMatrone = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const name = (formData.get("name") as string).trim()
    const region = formData.get("region") as string
    const email = (formData.get("email") as string)?.trim()
    const phone = (formData.get("phone") as string)?.trim()

    if (!name || !region) {
      toast({
        title: "Informations manquantes",
        description: "Le nom et la région sont obligatoires pour créer un compte matrone.",
      })
      return
    }

    const newMatrone: MatroneAccount = {
      id: `m${matrones.length + 1}`,
      name,
      region,
      email: email || undefined,
      phone: phone || undefined,
      patients: 0,
      status: "active",
      lastActive: "Maintenant",
      createdAt: new Date().toISOString(),
    }

    // Optimistically update UI
    setMatrones((prev) => [...prev, newMatrone])

    try {
      const res = await fetch('/api/matrones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMatrone),
      })
      const json = await res.json()
      if (res.ok && json?.success) {
        // replace temp item with persisted item (contains proper id)
      const persisted = json.data as MatroneAccount
      setMatrones((prev) => prev.map((p) => (p === newMatrone ? persisted : p)))
      toast({ title: 'Matrone ajoutée', description: `${persisted.name} a été ajoutée avec succès` })
      } else {
      throw new Error(json?.message || 'API error')
      }
    } catch (err: any) {
      // rollback
      setMatrones((prev) => prev.filter((p) => p !== newMatrone))
      toast({ title: 'Erreur', description: `Impossible de créer la matrone: ${err?.message ?? String(err)}` })
    } finally {
      setIsNewMatroneDialogOpen(false)
    }
  }

  const regionalData = [
    { region: "Abidjan", matrones: 5, coverage: 85 },
    { region: "Bouaké", matrones: 2, coverage: 60 },
    { region: "Yamoussoukro", matrones: 3, coverage: 75 },
    { region: "San-Pédro", matrones: 1, coverage: 40 },
    { region: "Daloa", matrones: 1, coverage: 45 },
  ]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl h-12 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="rounded-lg font-bold">
            Stats
          </TabsTrigger>
          <TabsTrigger value="matrones" className="rounded-lg font-bold">
            Matrones
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-lg font-bold">
            Alertes
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg font-bold">
            Rapports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <ShieldCheck className="w-8 h-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{matrones.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Matrones</div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/5 border-secondary/20 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Users className="w-8 h-8 text-secondary-foreground mb-2" />
                <div className="text-2xl font-bold">{MOCK_STATS.totalPatients}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Patientes</div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <BellRing className="w-8 h-8 text-destructive mb-2" />
                <div className="text-2xl font-bold text-destructive">{alerts.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Alertes</div>
              </CardContent>
            </Card>
            <Card className="bg-accent/5 border-accent/20 shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Activity className="w-8 h-8 text-accent-foreground mb-2" />
                <div className="text-2xl font-bold">{MOCK_STATS.systemHealth}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Santé</div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Distribution Régionale</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {regionalData.map((region) => (
                  <div key={region.region} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">{region.region}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{region.matrones} matrones</Badge>
                        <span className="text-muted-foreground">{region.coverage}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${region.coverage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrones" className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-bold tracking-tight">Gestion des Comptes</h3>
            <Button size="sm" className="gap-2 rounded-xl px-4" onClick={() => setIsNewMatroneDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Nouvelle Matrone
            </Button>
          </div>
          <div className="space-y-3">
            {matrones.map((m) => (
              <Card key={m.id} className="group hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center font-bold text-primary text-xl">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-lg">{m.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {m.region} - {m.patients} patientes suivies
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {m.email ?? m.phone ?? "Pas de contact"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:flex flex-col items-end">
                      <Badge variant={m.status === "active" ? "secondary" : "outline"} className="mb-1 font-bold">
                        {m.status === "active" ? "ACTIF" : "INACTIF"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{m.lastActive}</span>
                      <span className="text-[10px] text-muted-foreground">Créé le {new Date(m.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <Switch checked={m.status === "active"} onCheckedChange={() => toggleMatroneStatus(m.id)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-bold tracking-tight">Alertes Systèmes</h3>
            <Button variant="outline" size="sm" onClick={markAllAlertsAsRead} disabled={alerts.length === 0}>
              Tout marquer comme lu
            </Button>
          </div>
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-medium">Aucune alerte en cours</p>
                <p className="text-sm text-muted-foreground">Le système fonctionne normalement</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`border-l-4 ${alert.type === "error" ? "border-l-destructive shadow-destructive/5" : "border-l-orange-400 shadow-orange-500/5"}`}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${alert.type === "error" ? "bg-destructive/10 text-destructive" : "bg-orange-100 text-orange-600"}`}
                    >
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-lg leading-tight">{alert.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">Incident détecté à {alert.time}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg h-8 px-2"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Réparer
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-bold tracking-tight">Rapports et Analyses</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[
              {
                id: "report-1",
                name: "Rapport Mensuel Santé Maternelle",
                desc: "Données consolidées d'octobre 2023",
                icon: FileBarChart,
                stats: { consultations: 245, alertes: 12, satisfaction: "94%" },
              },
              {
                id: "report-2",
                name: "Performance du Réseau de Matrones",
                desc: "Analyse d'efficacité par district - Q3",
                icon: ClipboardList,
                stats: { matrones: 12, patientsMoyenne: 9, efficacite: "88%" },
              },
              {
                id: "report-3",
                name: "Analyse des Alertes Critiques",
                desc: "Corrélation entre zones et incidents",
                icon: Activity,
                stats: { total: 48, resolues: 45, enCours: 3 },
              },
            ].map((report) => (
              <Card
                key={report.id}
                className="hover:bg-muted/10 cursor-pointer group transition-colors"
                onClick={() => setSelectedReport(report.id)}
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                      <report.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{report.name}</div>
                      <div className="text-sm text-muted-foreground">{report.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isNewMatroneDialogOpen} onOpenChange={setIsNewMatroneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une Nouvelle Matrone</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMatrone} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet *</Label>
              <Input id="name" name="name" placeholder="Ex: Fatou Koné" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Région *</Label>
              <Select name="region" required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une région" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Abidjan">Abidjan</SelectItem>
                  <SelectItem value="Bouaké">Bouaké</SelectItem>
                  <SelectItem value="Yamoussoukro">Yamoussoukro</SelectItem>
                  <SelectItem value="San-Pédro">San-Pédro</SelectItem>
                  <SelectItem value="Daloa">Daloa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+225 07 12 34 56 78" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="matrone@example.com" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewMatroneDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Créer le compte</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du Rapport</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReport === "report-1" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary">245</div>
                      <div className="text-xs text-muted-foreground">Consultations</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-destructive">12</div>
                      <div className="text-xs text-muted-foreground">Alertes</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">94%</div>
                      <div className="text-xs text-muted-foreground">Satisfaction</div>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-sm text-muted-foreground">
                  Rapport mensuel consolidé des activités de santé maternelle sur l'ensemble du réseau.
                </p>
              </>
            )}
            {selectedReport === "report-2" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary">12</div>
                      <div className="text-xs text-muted-foreground">Matrones</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-secondary-foreground">9</div>
                      <div className="text-xs text-muted-foreground">Patientes/Matrone</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">88%</div>
                      <div className="text-xs text-muted-foreground">Efficacité</div>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-sm text-muted-foreground">
                  Analyse de performance des matrones par district avec indicateurs d'efficacité et de couverture.
                </p>
              </>
            )}
            {selectedReport === "report-3" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary">48</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">45</div>
                      <div className="text-xs text-muted-foreground">Résolues</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-destructive">3</div>
                      <div className="text-xs text-muted-foreground">En cours</div>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-sm text-muted-foreground">
                  Corrélation géographique des alertes critiques avec analyse des zones à risque et recommandations.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Fermer
            </Button>
            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Télécharger PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
