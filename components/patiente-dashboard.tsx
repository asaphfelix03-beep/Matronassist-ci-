"use client"

import type React from "react"

import { useCallback, useEffect, useState } from "react"
import { Activity, BookHeart, Calendar, Heart, MessageSquare, Plus, Stethoscope } from "lucide-react"

import { DashboardTabs } from "@/components/dashboard-tabs"
import { MessageThread } from "@/components/message-thread"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  describeWriteError,
  createJournalEntry,
  createMovement,
  fetchJournal,
  fetchMovements,
  fetchPatient,
} from "@/lib/api-client"
import { formatDate } from "@/lib/pregnancy"
import type { FetalMovement, JournalEntry, PatientDetail } from "@/lib/types"

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function PatienteDashboard({ patientId }: { patientId: string | null }) {
  const [record, setRecord] = useState<PatientDetail | null>(null)
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [movements, setMovements] = useState<FetalMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    if (!patientId) {
      setIsLoading(false)
      return
    }

    try {
      const [nextRecord, nextJournal, nextMovements] = await Promise.all([
        fetchPatient(patientId),
        fetchJournal(patientId),
        fetchMovements(patientId),
      ])
      setRecord(nextRecord)
      setJournal(nextJournal)
      setMovements(nextMovements)
    } catch (err) {
      toast({ title: "Chargement impossible", description: describe(err) })
    } finally {
      setIsLoading(false)
    }
  }, [patientId, toast])

  useEffect(() => {
    load()
  }, [load])

  const handleJournalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!patientId) return

    const form = e.currentTarget
    const content = ((new FormData(form).get("content") as string) ?? "").trim()
    if (!content) return

    setIsSubmitting(true)
    try {
      const entry = await createJournalEntry(patientId, content)
      setJournal((prev) => [entry, ...prev])
      form.reset()
      toast({ title: "Entrée ajoutée", description: "Votre journal a été mis à jour." })
    } catch (err) {
      toast(describeWriteError(err, "Enregistrement impossible"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMovementSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!patientId) return

    const form = e.currentTarget
    const formData = new FormData(form)
    const count = Number(formData.get("count"))
    const notes = ((formData.get("notes") as string) ?? "").trim() || null

    if (!Number.isFinite(count) || count < 0) {
      toast({ title: "Comptage invalide", description: "Indiquez un nombre de mouvements." })
      return
    }

    setIsSubmitting(true)
    try {
      const movement = await createMovement(patientId, count, notes)
      setMovements((prev) => [movement, ...prev])
      form.reset()
      toast({ title: "Relevé enregistré", description: `${count} mouvement(s) noté(s).` })
    } catch (err) {
      toast(describeWriteError(err, "Enregistrement impossible"))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!patientId) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <p className="font-medium">Aucun dossier de suivi rattaché à votre compte</p>
          <p className="text-sm text-muted-foreground">
            Contactez votre matrone référente pour qu'elle relie votre dossier à cet accès.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement de votre suivi…</p>
  }

  if (!record) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Votre dossier n'a pas pu être chargé. Réessayez plus tard.
        </CardContent>
      </Card>
    )
  }

  const week = record.week ?? 0
  const progress = Math.min(100, Math.round((week / 40) * 100))

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <DashboardTabs
          tabs={[
            { value: "overview", label: "Suivi", icon: Heart },
            { value: "journal", label: "Journal", icon: BookHeart },
            { value: "movements", label: "Bébé", icon: Activity },
            { value: "messages", label: "Messages", icon: MessageSquare },
          ]}
        />

        <TabsContent value="overview" className="space-y-6 pt-4">
          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Ma grossesse</div>
                  <div className="text-3xl font-bold">Semaine {record.week ?? "—"}</div>
                </div>
                <Heart className="w-10 h-10 text-primary fill-current" />
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Début : {formatDate(record.pregnancyStart)}</span>
                <span>Terme prévu : {formatDate(record.expectedDelivery)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Prochain rendez-vous
                </CardTitle>
              </CardHeader>
              <CardContent>
                {record.nextAppointment ? (
                  <>
                    <div className="text-xl font-bold">{formatDate(record.nextAppointment)}</div>
                    {record.appointments
                      .filter((a) => a.date === record.nextAppointment)
                      .slice(0, 1)
                      .map((a) => (
                        <div key={a.id} className="text-sm text-muted-foreground">
                          {a.time} • {a.type}
                        </div>
                      ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun rendez-vous planifié.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  Ma matrone
                </CardTitle>
              </CardHeader>
              <CardContent>
                {record.matroneName ? (
                  <div className="text-xl font-bold">{record.matroneName}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune matrone référente assignée.</p>
                )}
                <div className="text-sm text-muted-foreground">
                  Dernière visite : {formatDate(record.lastVisit)}
                </div>
              </CardContent>
            </Card>
          </div>

          {record.vitals && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Mes dernières constantes
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm text-muted-foreground">Tension</div>
                  <div className="font-bold">{record.vitals.bloodPressure ?? "—"}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm text-muted-foreground">Poids</div>
                  <div className="font-bold">{record.vitals.weight ? `${record.vitals.weight} kg` : "—"}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm text-muted-foreground">Température</div>
                  <div className="font-bold">
                    {record.vitals.temperature ? `${record.vitals.temperature} °C` : "—"}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 text-center">
                  <div className="text-sm text-muted-foreground">Pouls</div>
                  <div className="font-bold">{record.vitals.heartRate ? `${record.vitals.heartRate} bpm` : "—"}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mes consultations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {record.consultations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune consultation enregistrée pour le moment.</p>
              ) : (
                record.consultations.map((consultation) => (
                  <div key={consultation.id} className="p-4 border rounded-lg space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-bold">{consultation.type}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(consultation.date)}</div>
                    </div>
                    <p className="text-sm">{consultation.notes}</p>
                    {consultation.recordedByName && (
                      <p className="text-xs text-muted-foreground">Par {consultation.recordedByName}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookHeart className="w-5 h-5 text-primary" />
                Nouvelle entrée
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJournalSubmit} className="space-y-3">
                <Label htmlFor="journal-content" className="sr-only">
                  Votre ressenti du jour
                </Label>
                <Textarea
                  id="journal-content"
                  name="content"
                  rows={4}
                  required
                  maxLength={5000}
                  placeholder="Comment vous sentez-vous aujourd'hui ?"
                />
                <Button type="submit" className="gap-2" disabled={isSubmitting}>
                  <Plus className="w-4 h-4" />
                  {isSubmitting ? "Enregistrement…" : "Ajouter au journal"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {journal.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Votre journal est vide. Notez ce que vous ressentez, cela aide votre matrone à vous suivre.
                </CardContent>
              </Card>
            ) : (
              journal.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">{entry.week ? `Semaine ${entry.week}` : "Grossesse"}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compter les mouvements</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMovementSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="movement-count">Nombre de mouvements *</Label>
                    <Input id="movement-count" name="count" type="number" min={0} max={200} required placeholder="10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="movement-notes">Remarque</Label>
                    <Input id="movement-notes" name="notes" placeholder="Mouvements forts, après le repas…" />
                  </div>
                </div>
                <Button type="submit" className="gap-2" disabled={isSubmitting}>
                  <Plus className="w-4 h-4" />
                  {isSubmitting ? "Enregistrement…" : "Enregistrer le relevé"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Si vous sentez nettement moins votre bébé bouger que d'habitude, contactez votre matrone sans attendre.
                </p>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mes relevés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun relevé enregistré.</p>
              ) : (
                movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-bold">{movement.count} mouvements</div>
                      {movement.notes && <div className="text-sm text-muted-foreground">{movement.notes}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatDateTime(movement.recordedAt)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {record.matroneName ? `Échanger avec ${record.matroneName}` : "Messagerie"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MessageThread
                patientId={patientId}
                canCall={record.matroneName !== null}
                emptyLabel={
                  record.matroneName
                    ? "Aucun message. Posez votre première question."
                    : "Aucune matrone référente n'est encore assignée à votre dossier."
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
