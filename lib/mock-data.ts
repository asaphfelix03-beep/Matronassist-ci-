import type { MatroneAccount, StatsSummary, SystemAlert, UserRole } from "./types"

export const MOCK_USER = {
  role: "matrone" as UserRole, // Can be toggled for demo
  name: "Marie Koné",
}

export const MOCK_PATIENTS = [
  { id: "1", name: "Awa Diallo", week: 24, status: "stable", lastVisit: "2023-10-20" },
  { id: "2", name: "Fatou Traoré", week: 32, status: "alert", lastVisit: "2023-10-25" },
  { id: "3", name: "Zainab Ouattara", week: 12, status: "stable", lastVisit: "2023-10-22" },
]

export const MOCK_STATS: StatsSummary = {
  totalMatrones: 12,
  totalPatients: 45,
  pendingAppointments: 18,
  activeAlerts: 3,
  systemHealth: "98%",
}

export const MOCK_MATRONES: MatroneAccount[] = [
  {
    id: "m1",
    name: "Fatoumata Traoré",
    region: "Abidjan",
    email: "fatoumata.toure@health.ci",
    phone: "+225 07 11 22 33 44",
    patients: 12,
    status: "active",
    lastActive: "Il y a 2h",
    createdAt: "2024-01-10T08:00:00.000Z",
  },
  {
    id: "m2",
    name: "Bintou Touré",
    region: "Bouaké",
    email: "bintou.toure@health.ci",
    phone: "+225 05 22 33 44 55",
    patients: 8,
    status: "active",
    lastActive: "Il y a 5h",
    createdAt: "2024-01-11T09:30:00.000Z",
  },
  {
    id: "m3",
    name: "Aïcha Koné",
    region: "Yamoussoukro",
    email: "aicha.kone@health.ci",
    phone: "+225 01 33 44 55 66",
    patients: 15,
    status: "inactive",
    lastActive: "2 jours",
    createdAt: "2024-01-08T14:15:00.000Z",
  },
]

export const MOCK_SYSTEM_ALERTS: SystemAlert[] = [
  { id: "a1", type: "error", message: "Échec de synchronisation - Zone Nord", time: "10:45" },
  { id: "a2", type: "warning", message: "Stock de kits de test faible - Centre Médical Cocody", time: "09:30" },
]

export const MOCK_DETAILED_PATIENTS = [
  {
    id: "1",
    name: "Awa Diallo",
    age: 28,
    phone: "+225 07 12 34 56 78",
    week: 24,
    status: "stable",
    lastVisit: "2023-10-20",
    nextAppointment: "2023-11-05",
    bloodPressure: "120/80",
    weight: "68kg",
    temperature: "36.8°C",
    heartRate: "72 bpm",
    pregnancyStart: "2023-05-01",
    expectedDelivery: "2024-02-15",
    consultations: [
      { date: "2023-10-20", type: "Consultation prénatale", notes: "RAS, bébé en bonne santé", matrone: "Marie Koné" },
      { date: "2023-09-15", type: "Échographie", notes: "Croissance normale", matrone: "Marie Koné" },
      { date: "2023-08-10", type: "Consultation de routine", notes: "Vitamines prescrites", matrone: "Marie Koné" },
    ],
  },
  {
    id: "2",
    name: "Fatou Traoré",
    age: 32,
    phone: "+225 05 98 76 54 32",
    week: 32,
    status: "alert",
    lastVisit: "2023-10-25",
    nextAppointment: "2023-11-02",
    bloodPressure: "145/95",
    weight: "78kg",
    temperature: "37.1°C",
    heartRate: "88 bpm",
    pregnancyStart: "2023-03-15",
    expectedDelivery: "2023-12-20",
    consultations: [
      {
        date: "2023-10-25",
        type: "Consultation urgente",
        notes: "Tension élevée - surveillance rapprochée nécessaire",
        matrone: "Marie Koné",
      },
      { date: "2023-10-10", type: "Consultation prénatale", notes: "Tension normale", matrone: "Marie Koné" },
    ],
  },
  {
    id: "3",
    name: "Zainab Ouattara",
    age: 24,
    phone: "+225 01 23 45 67 89",
    week: 12,
    status: "stable",
    lastVisit: "2023-10-22",
    nextAppointment: "2023-11-12",
    bloodPressure: "115/75",
    weight: "62kg",
    temperature: "36.6°C",
    heartRate: "68 bpm",
    pregnancyStart: "2023-08-01",
    expectedDelivery: "2024-05-10",
    consultations: [
      { date: "2023-10-22", type: "Première visite", notes: "Dossier créé, examens initiaux", matrone: "Marie Koné" },
    ],
  },
]

export const MOCK_APPOINTMENTS = [
  { id: "apt1", patientName: "Awa Diallo", date: "2023-11-05", time: "09:00", type: "Consultation prénatale" },
  { id: "apt2", patientName: "Fatou Traoré", date: "2023-11-02", time: "14:30", type: "Suivi tension" },
  { id: "apt3", patientName: "Zainab Ouattara", date: "2023-11-12", time: "11:00", type: "Échographie" },
  { id: "apt4", patientName: "Mariam Koné", date: "2023-11-08", time: "10:00", type: "Consultation de routine" },
]

export const MOCK_MESSAGES = [
  {
    id: "msg1",
    from: "Awa Diallo",
    message: "Bonjour, j'ai ressenti quelques contractions ce matin",
    time: "10:45",
    unread: true,
  },
  {
    id: "msg2",
    from: "Fatou Traoré",
    message: "Merci pour la dernière consultation",
    time: "Hier",
    unread: false,
  },
  { id: "msg3", from: "Zainab Ouattara", message: "Puis-je reporter mon RDV ?", time: "Il y a 2j", unread: false },
]

export const MOCK_PREGNANCY_JOURNAL = [
  { date: "2023-10-28", week: 24, entry: "Première fois que je sens vraiment le bébé bouger ! C'est magique ✨" },
  { date: "2023-10-20", week: 23, entry: "Visite chez la matrone, tout va bien. Poids: 68kg" },
  { date: "2023-10-15", week: 23, entry: "Beaucoup d'énergie aujourd'hui, belle promenade au marché" },
]

export const MOCK_FETAL_MOVEMENTS = [
  { date: "2023-10-28", time: "14:30", count: 12, notes: "Mouvements forts" },
  { date: "2023-10-27", time: "09:15", count: 8, notes: "Mouvements légers" },
  { date: "2023-10-26", time: "16:00", count: 10, notes: "RAS" },
]
