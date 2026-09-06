"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  ClipboardList,
  Copy,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Phone,
  Plus,
  Thermometer,
  Users,
  Weight,
} from "lucide-react"

import { DashboardTabs } from "@/components/dashboard-tabs"
import { MessageThread } from "@/components/message-thread"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  describeWriteError,
  createAppointment,
  createConsultation,
  createPatient,
  fetchAppointments,
  fetchConversations,
  fetchPatient,
  fetchPatients,
} from "@/lib/api-client"
import { formatDate } from "@/lib/pregnancy"
import type { Appointment, Conversation, PatientDetail, PatientRecord } from "@/lib/types"

const CONSULTATION_TYPES = [
  "Consultation prénatale",
  "Consultation de routine",
  "Consultation d'urgence",
  "Échographie",
  "Première visite",
]

const APPOINTMENT_TYPES = ["Consultation prénatale", "Consultation de routine", "Suivi tension", "Échographie"]

/** Champ de formulaire vide -> null, pour que l'API le traite comme absent. */
function field(formData: FormData, name: string): string | null {
  const value = formData.get(name)
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function MatroneDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const [isCreatingPatient, setIsCreatingPatient] = useState(false)
  const [consultationPatientId, setConsultationPatientId] = useState<string | null>(null)
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [issuedAccess, setIssuedAccess] = useState<{ name: string; email: string; password: string } | null>(null)
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)

  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      const [nextPatients, nextAppointments, nextConversations] = await Promise.all([
        fetchPatients(),
        fetchAppointments(),
        fetchConversations(),
      ])
      setPatients(nextPatients)
      setAppointments(nextAppointments)
      setConversations(nextConversations)
    } catch (err) {
      toast({ title: "Chargement impossible", description: describe(err) })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadDetail = useCallback(
    async (id: string) => {
      setIsLoadingDetail(true)
      try {
        setPatientDetail(await fetchPatient(id))
      } catch (err) {
        toast({ title: "Fiche indisponible", description: describe(err) })
        setSelectedPatientId(null)
      } finally {
        setIsLoadingDetail(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientDetail(null)
      return
    }
    loadDetail(selectedPatientId)
  }, [selectedPatientId, loadDetail])

  const openPatient = (id: string) => {
    setSelectedPatientId(id)
    setIsCreatingPatient(false)
    setSelectedTab("patients")
  }

  const alertCount = useMemo(() => patients.filter((p) => p.status === "alert").length, [patients])
  const unreadTotal = useMemo(() => conversations.reduce((sum, c) => sum + c.unread, 0), [conversations])

  const markThreadRead = useCallback((patientId: string) => {
    setConversations((prev) => prev.map((c) => (c.patientId === patientId ? { ...c, unread: 0 } : c)))
  }, [])

  const handleCreatePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const name = field(formData, "name")

    if (!name) {
      toast({ title: "Informations manquantes", description: "Le nom de la patiente est obligatoire." })
      return
    }

    setIsSubmitting(true)
    try {
      const { patient, temporaryPassword } = await createPatient({
        name,
        age: field(formData, "age"),
        phone: field(formData, "phone"),
        address: field(formData, "address"),
        pregnancyStart: field(formData, "pregnancyStart"),
        expectedDelivery: field(formData, "expectedDelivery"),
        notes: field(formData, "notes"),
        loginEmail: field(formData, "loginEmail"),
      })

      setPatients((prev) => [...prev, patient])
      form.reset()
      setIsCreatingPatient(false)

      if (temporaryPassword && patient.email) {
        setIssuedAccess({ name: patient.name, email: patient.email, password: temporaryPassword })
      } else {
        toast({ title: "Dossier créé", description: `${patient.name} a été ajoutée à vos patientes.` })
      }

      openPatient(patient.id)
      await loadData()
    } catch (err) {
      toast(describeWriteError(err, "Création impossible"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConsultationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const patientId = (formData.get("patientId") as string) || consultationPatientId
    const type = field(formData, "consultationType")
    const notes = field(formData, "notes")
    const date = field(formData, "date")

    if (!patientId || !type || !notes || !date) {
      toast({ title: "Informations manquantes", description: "Patiente, type, date et observations sont requis." })
      return
    }

    setIsSubmitting(true)
    try {
      const { patientStatus } = await createConsultation(patientId, {
        type,
        date,
        notes,
        bloodPressure: field(formData, "bloodPressure"),
        weight: field(formData, "weight"),
        temperature: field(formData, "temperature"),
        heartRate: field(formData, "heartRate"),
      })

      form.reset()
      setConsultationPatientId(null)

      await loadData()
      if (selectedPatientId === patientId) {
        await loadDetail(patientId)
      }

      toast({
        title: "Consultation enregistrée",
        description:
          patientStatus === "alert"
            ? "Constantes hors seuils : la fiche passe en surveillance."
            : "Le dossier de la patiente a été mis à jour.",
      })
    } catch (err) {
      toast(describeWriteError(err, "Enregistrement impossible"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAppointmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const patientId = formData.get("patientId") as string
    const date = field(formData, "date")
    const time = field(formData, "time")
    const type = field(formData, "appointmentType")

    if (!patientId || !date || !time || !type) {
      toast({ title: "Informations manquantes", description: "Patiente, date, heure et type sont requis." })
      return
    }

    setIsSubmitting(true)
    try {
      await createAppointment({ patientId, date, time, type })
      form.reset()
      setIsAppointmentDialogOpen(false)
      await loadData()
      if (selectedPatientId === patientId) {
        await loadDetail(patientId)
      }
      toast({ title: "Rendez-vous planifié", description: `Le ${formatDate(date)} à ${time}.` })
    } catch (err) {
      toast(describeWriteError(err, "Planification impossible"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyAccess = async () => {
    if (!issuedAccess) return
    try {
      await navigator.clipboard.writeText(`${issuedAccess.email} / ${issuedAccess.password}`)
      toast({ title: "Copié", description: "Identifiants copiés." })
    } catch {
      toast({ title: "Copie impossible", description: "Notez les identifiants manuellement." })
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <DashboardTabs
          tabs={[
            { value: "overview", label: "Vue", icon: LayoutDashboard },
            { value: "patients", label: "Patientes", icon: Users },
            { value: "calendar", label: "Agenda", icon: Calendar },
            { value: "messages", label: "Messages", icon: MessageSquare, badge: unreadTotal },
          ]}
        />

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Users className="w-8 h-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{isLoading ? "…" : patients.length}</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">Patientes</div>
              </CardContent>
            </Card>
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Calendar className="w-8 h-8 text-accent-foreground mb-2" />
                <div className="text-2xl font-bold">{isLoading ? "…" : appointments.length}</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">RDV à venir</div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20 col-span-2 md:col-span-1">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                <div className="text-2xl font-bold text-destructive">{isLoading ? "…" : alertCount}</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">Sous surveillance</div>
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
                  setSelectedPatientId(null)
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
                onClick={() => setConsultationPatientId(patients[0]?.id ?? null)}
                disabled={patients.length === 0}
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
              {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
              {!isLoading && patients.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune patiente enregistrée pour le moment.</p>
              )}
              {patients.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => openPatient(p.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${p.status === "alert" ? "bg-destructive animate-pulse" : "bg-green-500"}`}
                    />
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Semaine {p.week ?? "—"} • Prochain RDV: {formatDate(p.nextAppointment)}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4 pt-4">
          {!selectedPatientId && !isCreatingPatient ? (
            <>
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xl font-bold">Mes Patientes</h3>
                <Button size="sm" className="gap-2 rounded-lg" onClick={() => setIsCreatingPatient(true)}>
                  <Plus className="w-4 h-4" /> Ajouter
                </Button>
              </div>
              {isLoading ? (
                <p className="px-1 text-sm text-muted-foreground">Chargement des dossiers…</p>
              ) : patients.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center space-y-3">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="font-medium">Aucune patiente pour l'instant</p>
                    <p className="text-sm text-muted-foreground">
                      Créez un premier dossier pour commencer le suivi de grossesse.
                    </p>
                    <Button className="gap-2" onClick={() => setIsCreatingPatient(true)}>
                      <Plus className="w-4 h-4" /> Nouvelle patiente
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {patients.map((patient) => (
                    <Card
                      key={patient.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => openPatient(patient.id)}
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
                                  {patient.phone ?? "Pas de téléphone"}
                                </div>
                                <div>
                                  {patient.age ? `${patient.age} ans • ` : ""}Semaine {patient.week ?? "—"}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <Badge variant={patient.status === "alert" ? "destructive" : "secondary"}>
                                  {patient.status === "alert" ? "Surveillance" : "Stable"}
                                </Badge>
                                <Badge variant="outline">Prochain RDV: {formatDate(patient.nextAppointment)}</Badge>
                                {patient.hasLogin && <Badge variant="outline">Accès application</Badge>}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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
              <CardContent>
                <form onSubmit={handleCreatePatient} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet *</Label>
                      <Input id="name" name="name" placeholder="Ex: Awa Diallo" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Âge</Label>
                      <Input id="age" name="age" type="number" min={10} max={60} placeholder="28" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input id="phone" name="phone" type="tel" placeholder="+225 07 12 34 56 78" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Localisation</Label>
                      <Input id="address" name="address" placeholder="Quartier, Ville" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pregnancyStart">Date début grossesse</Label>
                      <Input id="pregnancyStart" name="pregnancyStart" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedDelivery">Date d'accouchement prévue</Label>
                      <Input id="expectedDelivery" name="expectedDelivery" type="date" />
                      <p className="text-xs text-muted-foreground">
                        Calculée automatiquement (40 semaines) si laissée vide.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes médicales</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Antécédents, allergies, notes importantes..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                    <Label htmlFor="loginEmail">Accès à l'application (optionnel)</Label>
                    <Input id="loginEmail" name="loginEmail" type="email" placeholder="patiente@email.com" />
                    <p className="text-xs text-muted-foreground">
                      Si vous renseignez un email, un compte est créé avec un mot de passe provisoire pour que la
                      patiente suive sa grossesse et vous écrive.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? "Création…" : "Créer le dossier"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCreatingPatient(false)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : isLoadingDetail || !patientDetail ? (
            <p className="px-1 text-sm text-muted-foreground">Chargement de la fiche…</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatientId(null)}>
                  ← Retour
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl">{patientDetail.name}</CardTitle>
                      <p className="text-muted-foreground mt-1">
                        {patientDetail.age ? `${patientDetail.age} ans • ` : ""}
                        Semaine {patientDetail.week ?? "—"} de grossesse
                      </p>
                    </div>
                    <Badge variant={patientDetail.status === "alert" ? "destructive" : "secondary"} className="text-sm">
                      {patientDetail.status === "alert" ? "Surveillance" : "Stable"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{patientDetail.phone ?? "Pas de téléphone"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>RDV: {formatDate(patientDetail.nextAppointment)}</span>
                    </div>
                  </div>
                  {patientDetail.notes && <p className="text-sm text-muted-foreground">{patientDetail.notes}</p>}
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
                  {patientDetail.vitals ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <Heart className="w-5 h-5 mx-auto mb-2 text-red-500" />
                        <div className="text-sm text-muted-foreground">Tension</div>
                        <div className="font-bold">{patientDetail.vitals.bloodPressure ?? "—"}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <Weight className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                        <div className="text-sm text-muted-foreground">Poids</div>
                        <div className="font-bold">
                          {patientDetail.vitals.weight ? `${patientDetail.vitals.weight} kg` : "—"}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <Thermometer className="w-5 h-5 mx-auto mb-2 text-orange-500" />
                        <div className="text-sm text-muted-foreground">Température</div>
                        <div className="font-bold">
                          {patientDetail.vitals.temperature ? `${patientDetail.vitals.temperature} °C` : "—"}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <Activity className="w-5 h-5 mx-auto mb-2 text-green-500" />
                        <div className="text-sm text-muted-foreground">Pouls</div>
                        <div className="font-bold">
                          {patientDetail.vitals.heartRate ? `${patientDetail.vitals.heartRate} bpm` : "—"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucune constante enregistrée. Elles sont relevées lors d'une consultation.
                    </p>
                  )}
                  <Button
                    className="w-full mt-4 bg-transparent"
                    variant="outline"
                    onClick={() => setConsultationPatientId(patientDetail.id)}
                  >
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
                    <span className="font-bold">{formatDate(patientDetail.pregnancyStart)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">Date prévue d'accouchement</span>
                    <span className="font-bold text-primary">{formatDate(patientDetail.expectedDelivery)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg border border-secondary/30">
                    <span className="text-sm font-medium">Progression</span>
                    <span className="font-bold text-lg text-secondary-foreground">
                      Semaine {patientDetail.week ?? "—"}/40
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historique des Consultations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patientDetail.consultations.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucune consultation enregistrée.</p>
                  )}
                  {patientDetail.consultations.map((consult) => (
                    <div key={consult.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold">{consult.type}</div>
                          <div className="text-sm text-muted-foreground">{formatDate(consult.date)}</div>
                        </div>
                        {consult.recordedByName && <Badge variant="outline">{consult.recordedByName}</Badge>}
                      </div>
                      <p className="text-sm">{consult.notes}</p>
                      {consult.bloodPressure && (
                        <p className="text-xs text-muted-foreground">Tension relevée: {consult.bloodPressure}</p>
                      )}
                    </div>
                  ))}
                  <Button
                    className="w-full bg-transparent"
                    variant="outline"
                    onClick={() => setConsultationPatientId(patientDetail.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une consultation
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Messagerie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MessageThread
                    patientId={patientDetail.id}
                    onRead={markThreadRead}
                    canCall={patientDetail.hasLogin}
                    emptyLabel={
                      patientDetail.hasLogin
                        ? "Aucun message. Écrivez le premier."
                        : "Cette patiente n'a pas d'accès à l'application : elle ne pourra ni répondre ni être appelée."
                    }
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-bold">Calendrier des Rendez-vous</h3>
            <Button
              size="sm"
              className="gap-2 rounded-lg"
              onClick={() => setIsAppointmentDialogOpen(true)}
              disabled={patients.length === 0}
            >
              <Plus className="w-4 h-4" /> Nouveau RDV
            </Button>
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
              {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
              {!isLoading && appointments.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun rendez-vous à venir.</p>
              )}
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => openPatient(apt.patientId)}
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
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4 pt-4">
          <h3 className="text-xl font-bold px-1">Messagerie</h3>
          {isLoading ? (
            <p className="px-1 text-sm text-muted-foreground">Chargement…</p>
          ) : conversations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Aucune patiente à contacter pour le moment.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {conversations.map((conversation) => (
                  <div key={conversation.patientId}>
                    <button
                      type="button"
                      className="w-full p-4 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors"
                      onClick={() =>
                        setOpenThreadId((current) =>
                          current === conversation.patientId ? null : conversation.patientId,
                        )
                      }
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0">
                        {conversation.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-bold truncate">{conversation.patientName}</div>
                          {conversation.lastMessageAt && (
                            <div className="text-xs text-muted-foreground shrink-0">
                              {formatDate(conversation.lastMessageAt)}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {conversation.lastMessage ?? "Aucun message"}
                        </p>
                      </div>
                      {conversation.unread > 0 && (
                        <Badge variant="destructive" className="shrink-0">
                          {conversation.unread}
                        </Badge>
                      )}
                    </button>
                    {openThreadId === conversation.patientId && (
                      <div className="p-4 pt-0">
                        <MessageThread
                          patientId={conversation.patientId}
                          onRead={markThreadRead}
                          emptyLabel="Aucun message. Écrivez le premier."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={consultationPatientId !== null} onOpenChange={(open) => !open && setConsultationPatientId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Saisie de Consultation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConsultationSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient-select">Patiente *</Label>
              <Select name="patientId" required defaultValue={consultationPatientId ?? undefined}>
                <SelectTrigger id="patient-select">
                  <SelectValue placeholder="Sélectionner une patiente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.week ? ` - Semaine ${p.week}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consultationType">Type de consultation *</Label>
                <Select name="consultationType" required>
                  <SelectTrigger id="consultationType">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSULTATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultationDate">Date *</Label>
                <Input
                  id="consultationDate"
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bloodPressure">Tension</Label>
                <Input id="bloodPressure" name="bloodPressure" placeholder="120/80" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Poids (kg)</Label>
                <Input id="weight" name="weight" type="number" step="0.1" placeholder="68" />
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
            <p className="text-xs text-muted-foreground">
              Une tension ≥ 140/90, une température ≥ 38 °C ou un pouls ≥ 110 bpm placent automatiquement la fiche en
              surveillance.
            </p>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes et observations *</Label>
              <Textarea id="notes" name="notes" placeholder="Détails de la consultation..." rows={4} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConsultationPatientId(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier un Rendez-vous</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAppointmentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appointment-patient">Patiente *</Label>
              <Select name="patientId" required defaultValue={selectedPatientId ?? undefined}>
                <SelectTrigger id="appointment-patient">
                  <SelectValue placeholder="Sélectionner une patiente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointmentDate">Date *</Label>
                <Input id="appointmentDate" name="date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentTime">Heure *</Label>
                <Input id="appointmentTime" name="time" type="time" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointmentType">Type *</Label>
              <Select name="appointmentType" required>
                <SelectTrigger id="appointmentType">
                  <SelectValue placeholder="Type de rendez-vous" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAppointmentDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Planification…" : "Planifier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={issuedAccess !== null} onOpenChange={(open) => !open && setIssuedAccess(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accès créé pour {issuedAccess?.name}</DialogTitle>
            <DialogDescription>
              Ce mot de passe provisoire n'est affiché qu'une fois. La patiente devra le changer à sa première
              connexion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
            <div className="break-all">{issuedAccess?.email}</div>
            <div className="text-lg font-bold tracking-wider break-all">{issuedAccess?.password}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="gap-2" onClick={copyAccess}>
              <Copy className="w-4 h-4" />
              Copier
            </Button>
            <Button onClick={() => setIssuedAccess(null)}>J'ai noté</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
