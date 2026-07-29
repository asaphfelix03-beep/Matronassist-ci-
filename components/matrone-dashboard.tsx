"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MOCK_STATS, MOCK_DETAILED_PATIENTS, MOCK_APPOINTMENTS, MOCK_MESSAGES } from "@/lib/mock-data"
import {
  Users,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRight,
  ClipboardList,
  Phone,
  Activity,
  Heart,
  Thermometer,
  Weight,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export function MatroneDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [isCreatingPatient, setIsCreatingPatient] = useState(false)
  const [isConsultationDialogOpen, setIsConsultationDialogOpen] = useState(false)
  const { toast } = useToast()

  const handleConsultationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    toast({
      title: "Consultation enregistrée",
      description: "La consultation a été enregistrée avec succès",
    })
    setIsConsultationDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl h-12 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="rounded-lg font-bold">
            Vue
          </TabsTrigger>
          <TabsTrigger value="patients" className="rounded-lg font-bold">
            Patientes
          </TabsTrigger>
          <TabsTrigger value="calendar" className="rounded-lg font-bold">
            Agenda
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-lg font-bold">
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Users className="w-8 h-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{MOCK_STATS.totalPatients}</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">Patientes</div>
              </CardContent>
            </Card>
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Calendar className="w-8 h-8 text-accent-foreground mb-2" />
                <div className="text-2xl font-bold">{MOCK_STATS.pendingAppointments}</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">RDV Prévus</div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20 col-span-2 md:col-span-1">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                <div className="text-2xl font-bold text-destructive">{MOCK_STATS.activeAlerts}</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">Alertes Critiques</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-bold px-1">Actions rapides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                size="lg"
                className="h-16 gap-3 text-lg rounded-2xl shadow-sm"
                onClick={() => {
                  setIsCreatingPatient(true)
                  setSelectedTab("patients")
                }}
              >
                <Plus className="w-6 h-6" />
                Nouvelle Patiente
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="h-16 gap-3 text-lg rounded-2xl shadow-sm border"
                onClick={() => setIsConsultationDialogOpen(true)}
              >
                <ClipboardList className="w-6 h-6" />
                Saisie Consultation
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Patientes récentes</CardTitle>
                <Button variant="link" className="text-primary font-bold" onClick={() => setSelectedTab("patients")}>
                  Voir tout
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {MOCK_DETAILED_PATIENTS.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedPatient(p.id)
                    setSelectedTab("patients")
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${p.status === "alert" ? "bg-destructive animate-pulse" : "bg-green-500"}`}
                    />
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Semaine {p.week} • Prochain RDV: {p.nextAppointment}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4 pt-4">
          {!selectedPatient && !isCreatingPatient ? (
            <>
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xl font-bold">Mes Patientes</h3>
                <Button size="sm" className="gap-2 rounded-lg" onClick={() => setIsCreatingPatient(true)}>
                  <Plus className="w-4 h-4" /> Ajouter
                </Button>
              </div>
              <div className="space-y-3">
                {MOCK_DETAILED_PATIENTS.map((patient) => (
                  <Card
                    key={patient.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedPatient(patient.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`w-3 h-3 mt-2 rounded-full ${patient.status === "alert" ? "bg-destructive animate-pulse" : "bg-green-500"}`}
                          />
                          <div className="flex-1">
                            <div className="font-bold text-lg">{patient.name}</div>
                            <div className="text-sm text-muted-foreground space-y-1 mt-1">
                              <div className="flex items-center gap-2">
                                <Phone className="w-3 h-3" />
                                {patient.phone}
                              </div>
                              <div>
                                {patient.age} ans • Semaine {patient.week}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Badge variant={patient.status === "alert" ? "destructive" : "secondary"}>
                                {patient.status === "alert" ? "Surveillance" : "Stable"}
                              </Badge>
                              <Badge variant="outline">Prochain RDV: {patient.nextAppointment}</Badge>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : isCreatingPatient ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsCreatingPatient(false)}>
                    ← Retour
                  </Button>
                </div>
                <CardTitle>Nouvelle Patiente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet *</Label>
                    <Input id="name" placeholder="Ex: Awa Diallo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Âge *</Label>
                    <Input id="age" type="number" placeholder="28" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input id="phone" type="tel" placeholder="+225 07 12 34 56 78" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Localisation</Label>
                    <Input id="address" placeholder="Quartier, Ville" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pregnancyStart">Date début grossesse *</Label>
                    <Input id="pregnancyStart" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedDelivery">Date d'accouchement prévue</Label>
                    <Input id="expectedDelivery" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes médicales</Label>
                  <Textarea id="notes" placeholder="Antécédents, allergies, notes importantes..." rows={4} />
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1">Créer le dossier</Button>
                  <Button variant="outline" onClick={() => setIsCreatingPatient(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {MOCK_DETAILED_PATIENTS.filter((p) => p.id === selectedPatient).map((patient) => (
                <div key={patient.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                      ← Retour
                    </Button>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-2xl">{patient.name}</CardTitle>
                          <p className="text-muted-foreground mt-1">
                            {patient.age} ans • Semaine {patient.week} de grossesse
                          </p>
                        </div>
                        <Badge variant={patient.status === "alert" ? "destructive" : "secondary"} className="text-sm">
                          {patient.status === "alert" ? "Alerte" : "Stable"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{patient.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>RDV: {patient.nextAppointment}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Constantes Vitales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-muted/30 text-center">
                          <Heart className="w-5 h-5 mx-auto mb-2 text-red-500" />
                          <div className="text-sm text-muted-foreground">Tension</div>
                          <div className="font-bold">{patient.bloodPressure}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 text-center">
                          <Weight className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                          <div className="text-sm text-muted-foreground">Poids</div>
                          <div className="font-bold">{patient.weight}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 text-center">
                          <Thermometer className="w-5 h-5 mx-auto mb-2 text-orange-500" />
                          <div className="text-sm text-muted-foreground">Température</div>
                          <div className="font-bold">{patient.temperature}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 text-center">
                          <Activity className="w-5 h-5 mx-auto mb-2 text-green-500" />
                          <div className="text-sm text-muted-foreground">Pouls</div>
                          <div className="font-bold">{patient.heartRate}</div>
                        </div>
                      </div>
                      <Button className="w-full mt-4 bg-transparent" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Enregistrer nouvelles constantes
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Suivi Grossesse</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Début de grossesse</span>
                        <span className="font-bold">{patient.pregnancyStart}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Date prévue d'accouchement</span>
                        <span className="font-bold text-primary">{patient.expectedDelivery}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg border border-secondary/30">
                        <span className="text-sm font-medium">Progression</span>
                        <span className="font-bold text-lg text-secondary-foreground">Semaine {patient.week}/40</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Historique des Consultations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {patient.consultations.map((consult, idx) => (
                        <div key={idx} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold">{consult.type}</div>
                              <div className="text-sm text-muted-foreground">{consult.date}</div>
                            </div>
                            <Badge variant="outline">{consult.matrone}</Badge>
                          </div>
                          <p className="text-sm">{consult.notes}</p>
                        </div>
                      ))}
                      <Button className="w-full bg-transparent" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une consultation
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4 pt-4">
          <h3 className="text-xl font-bold px-1">Calendrier des Rendez-vous</h3>
          <Card>
            <CardContent className="p-4 space-y-3">
              {MOCK_APPOINTMENTS.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="bg-primary/10 p-3 rounded-xl text-center min-w-[60px]">
                    <div className="text-xs font-bold uppercase text-primary">
                      {new Date(apt.date).toLocaleDateString("fr-FR", { month: "short" })}
                    </div>
                    <div className="text-xl font-black">{new Date(apt.date).getDate()}</div>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{apt.patientName}</div>
                    <div className="text-sm text-muted-foreground">
                      {apt.time} • {apt.type}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4 pt-4">
          <h3 className="text-xl font-bold px-1">Messagerie</h3>
          <Card>
            <CardContent className="p-0 divide-y">
              {MOCK_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-muted/30 transition-colors ${msg.unread ? "bg-primary/5" : ""}`}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                    {msg.from.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-bold">{msg.from}</div>
                      <div className="text-xs text-muted-foreground">{msg.time}</div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                  </div>
                  {msg.unread && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isConsultationDialogOpen} onOpenChange={setIsConsultationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Saisie de Consultation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConsultationSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient-select">Patiente *</Label>
              <Select name="patientId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une patiente" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_DETAILED_PATIENTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - Semaine {p.week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consultationType">Type de consultation *</Label>
                <Select name="consultationType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prenatale">Consultation prénatale</SelectItem>
                    <SelectItem value="routine">Consultation de routine</SelectItem>
                    <SelectItem value="urgence">Consultation d'urgence</SelectItem>
                    <SelectItem value="echographie">Échographie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultationDate">Date *</Label>
                <Input id="consultationDate" name="date" type="date" required />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bloodPressure">Tension</Label>
                <Input id="bloodPressure" name="bloodPressure" placeholder="120/80" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Poids (kg)</Label>
                <Input id="weight" name="weight" type="number" placeholder="68" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Température</Label>
                <Input id="temperature" name="temperature" placeholder="36.8" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heartRate">Pouls</Label>
                <Input id="heartRate" name="heartRate" placeholder="72" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes et observations *</Label>
              <Textarea id="notes" name="notes" placeholder="Détails de la consultation..." rows={4} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsConsultationDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
