"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MOCK_DETAILED_PATIENTS, MOCK_PREGNANCY_JOURNAL, MOCK_FETAL_MOVEMENTS } from "@/lib/mock-data"
import { Baby, MessageSquare, Activity, BookOpen, Heart, Calculator, User } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export function PatienteDashboard() {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState("overview")
  const [showFetalMovementForm, setShowFetalMovementForm] = useState(false)
  const [showJournalForm, setShowJournalForm] = useState(false)

  const patient = MOCK_DETAILED_PATIENTS[0]
  const weekProgress = (patient.week / 40) * 100

  return (
    <div className="space-y-6 pb-20">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl h-12 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="rounded-lg font-bold">
            Moi
          </TabsTrigger>
          <TabsTrigger value="pregnancy" className="rounded-lg font-bold">
            Bébé
          </TabsTrigger>
          <TabsTrigger value="journal" className="rounded-lg font-bold">
            Journal
          </TabsTrigger>
          <TabsTrigger value="account" className="rounded-lg font-bold">
            Profil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <Card className="bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/30 relative overflow-hidden shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                  <h3 className="text-2xl font-black text-secondary-foreground uppercase tracking-tight">
                    Ma Grossesse
                  </h3>
                  <p className="text-sm font-bold text-muted-foreground">S{patient.week} de 40 semaines</p>
                </div>
                <Baby className="w-16 h-16 text-secondary-foreground opacity-10 absolute -right-2 -top-2" />
              </div>
              <Progress value={weekProgress} className="h-4 mb-4 bg-muted" />
              <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                <span>Départ</span>
                <span className="text-secondary-foreground">{Math.round(weekProgress)}% parcourus</span>
                <span>Terme</span>
              </div>
              <div className="mt-6 flex items-center justify-between p-4 bg-background/60 backdrop-blur-sm rounded-2xl border border-secondary/20 shadow-sm">
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Accouchement prévu
                  </div>
                  <div className="text-xl font-black text-secondary-foreground">{patient.expectedDelivery}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-32 flex-col gap-3 rounded-2xl bg-card border-2 border-primary/20 hover:bg-primary/5 hover:border-primary shadow-sm group"
              onClick={() => setSelectedTab("journal")}
            >
              <div className="p-3 rounded-xl bg-primary/5 text-primary group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8" />
              </div>
              <span className="font-black text-xs uppercase tracking-wider">Mon Journal</span>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex-col gap-3 rounded-2xl bg-card border-2 border-accent/20 hover:bg-accent/5 hover:border-accent shadow-sm group"
              onClick={() => setSelectedTab("pregnancy")}
            >
              <div className="p-3 rounded-xl bg-accent/5 text-accent-foreground group-hover:scale-110 transition-transform">
                <Activity className="w-8 h-8" />
              </div>
              <span className="font-black text-xs uppercase tracking-wider">Mouvements</span>
            </Button>
          </div>

          <Card className="border-l-4 border-l-accent shadow-sm">
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-xs font-black text-accent-foreground uppercase tracking-[0.2em]">
                Rendez-vous à venir
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-center gap-4">
                <div className="bg-accent/10 p-3 rounded-2xl text-center min-w-[70px] border border-accent/20">
                  <div className="text-[10px] font-black uppercase text-accent-foreground">
                    {new Date(patient.nextAppointment).toLocaleDateString("fr-FR", { month: "short" })}
                  </div>
                  <div className="text-3xl font-black text-accent-foreground leading-none">
                    {new Date(patient.nextAppointment).getDate()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-black text-lg">Consultation prénatale</div>
                  <div className="text-sm text-muted-foreground font-medium">District Sanitaire Cocody</div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-6 h-12 rounded-xl font-bold gap-2 bg-transparent shadow-none border-2"
              >
                <MessageSquare className="w-5 h-5" />
                Écrire à ma matrone
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pregnancy" className="space-y-6 pt-4">
          <h3 className="text-xl font-black tracking-tight px-1">Suivi du Bébé</h3>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-destructive" />
                  Compteur de Mouvements
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowFetalMovementForm(!showFetalMovementForm)}
                  className="h-8 rounded-lg font-bold"
                >
                  {showFetalMovementForm ? "Annuler" : "Ajouter +"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showFetalMovementForm && (
                <div className="p-5 border-2 border-primary/20 rounded-2xl space-y-4 bg-primary/5 animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase ml-1">Heure</Label>
                      <Input type="time" className="h-12 text-lg font-bold rounded-xl bg-background border-2" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase ml-1">Mouvements</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="h-12 text-lg font-bold rounded-xl bg-background border-2"
                      />
                    </div>
                  </div>
                  <Button className="w-full h-12 rounded-xl font-black text-lg shadow-md">Enregistrer</Button>
                </div>
              )}

              <div className="space-y-2">
                {MOCK_FETAL_MOVEMENTS.map((mv, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/20 border rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <div className="font-black text-lg">{mv.count} Coups</div>
                        <div className="text-xs text-muted-foreground font-bold uppercase">
                          {mv.date} à {mv.time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal" className="space-y-6 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-black tracking-tight">Journal Intime</h3>
            <Button size="sm" onClick={() => setShowJournalForm(!showJournalForm)} className="rounded-xl font-bold h-9">
              {showJournalForm ? "Annuler" : "+ Nouveau"}
            </Button>
          </div>

          {showJournalForm && (
            <Card className="animate-in slide-in-from-top-4 duration-200 shadow-lg border-2 border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <Textarea
                  placeholder="Comment s'est passée votre journée ? Pensées, sensations..."
                  rows={6}
                  className="text-lg rounded-2xl p-4 border-2 bg-muted/5 focus:bg-background transition-colors"
                />
                <Button className="w-full h-14 rounded-2xl font-black text-xl shadow-md">Enregistrer la pensée</Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {MOCK_PREGNANCY_JOURNAL.map((entry, i) => (
              <Card key={i} className="rounded-2xl border-2 hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-black text-lg text-primary">{entry.date}</div>
                      <Badge variant="outline" className="font-bold text-[10px] tracking-widest mt-1">
                        SEMAINE {entry.week}
                      </Badge>
                    </div>
                    <BookOpen className="w-6 h-6 text-primary/40" />
                  </div>
                  <p className="text-muted-foreground font-medium italic leading-relaxed text-balance">
                    "{entry.entry}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="account" className="space-y-6 pt-4">
          <h3 className="text-xl font-black tracking-tight px-1">Mon Profil</h3>
          <Card className="rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-lg">Infos Personnelles</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col items-center justify-center pb-4">
                <div className="w-20 h-20 rounded-3xl bg-secondary/10 flex items-center justify-center mb-2">
                  <User className="w-10 h-10 text-secondary-foreground" />
                </div>
                <div className="font-black text-xl">{patient.name}</div>
                <div className="text-sm font-bold text-muted-foreground">{patient.phone}</div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="font-bold ml-1">Email</Label>
                  <Input defaultValue="awa.diallo@email.ci" className="h-12 rounded-xl bg-muted/20 border-2" />
                </div>
                <Button
                  className="w-full h-12 rounded-xl font-bold bg-transparent border-2 shadow-none"
                  variant="outline"
                >
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-2 border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Ma Matrone Référente</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl">
                  M
                </div>
                <div>
                  <div className="font-black text-xl">Marie Koné</div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Matrone de Secteur
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            variant="destructive"
            className="w-full h-14 rounded-2xl font-black text-lg shadow-md mt-4"
            onClick={() => {
              localStorage.removeItem("userRole")
              localStorage.removeItem("userEmail")
              router.push("/login")
            }}
          >
            Me déconnecter
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
