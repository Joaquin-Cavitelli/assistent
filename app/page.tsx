"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Sector, EventConfig } from "@/lib/types"
import { SectorCard } from "@/components/sector-card"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDate, formatTime } from "@/lib/utils"
import { AlertCircle, Users, Clock } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [config, setConfig] = useState<EventConfig>({ startDateTime: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for sectors changes
    const sectorsQuery = query(collection(db, "sectors"))
    const unsubscribeSectors = onSnapshot(sectorsQuery, (snapshot) => {
      const sectorsData: Sector[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        sectorsData.push({
          id: doc.id,
          name: data.name,
          manager: data.manager,
          attendees: data.attendees || 0,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated.toDate()) : null,
          completed: !!data.completed,
        })
      })
      setSectors(sectorsData)
      setLoading(false)
    })

    // Listen for config changes
    const configQuery = query(collection(db, "config"))
    const unsubscribeConfig = onSnapshot(configQuery, (snapshot) => {
      snapshot.forEach((doc) => {
        if (doc.id === "eventConfig") {
          const data = doc.data()
          setConfig({
            startDateTime: data.startDateTime ? new Date(data.startDateTime.toDate()) : null,
          })
        }
      })
    })

    return () => {
      unsubscribeSectors()
      unsubscribeConfig()
    }
  }, [])

  // Calculate stats
  const totalAttendees = sectors.reduce((sum, sector) => sum + (sector.attendees || 0), 0)
  const completedSectors = sectors.filter((sector) => sector.completed).length
  const completionPercentage = sectors.length > 0 ? (completedSectors / sectors.length) * 100 : 0
  const allSectorsCompleted = sectors.length > 0 && completedSectors === sectors.length

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <Link href="/admin">
        <Card className="shadow-sm mb-4 hover:shadow transition-shadow">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                   Hora de inicio:
                </span>
                <span className="text-xl font-bold">
                  {config.startDateTime ? formatTime(config.startDateTime) : "--:--"}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {config.startDateTime ? formatDate(config.startDateTime) : "No configurado"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  Total asistentes:
                </span>
                <span className="text-2xl font-bold">{totalAttendees}</span>
              </div>
            </div>

            {!config.startDateTime && (
              
                <div className="flex items-center gap-2 bg-red-50 p-6 rounded-md">
                <p className="text-xs">No se ha configurado la fecha y hora de inicio.</p>
                </div>
            )}

            {allSectorsCompleted && sectors.length > 0 && (
              <Alert className="bg-green-50 text-green-800 border-green-200 py-2 px-3">
                <AlertDescription className="text-xs font-medium">
                  ¡Conteo completado! Total: {totalAttendees} asistentes.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progreso del conteo</span>
                <span>
                  {completedSectors} de {sectors.length} sectores
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </Link>

      <h2 className="text-lg font-bold mb-3 px-4">Sectores</h2>

      {sectors.length === 0 ? (
        <Alert className="py-3 mx-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No hay sectores configurados. Acceda a Admin para agregar sectores.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3 px-4">
          {sectors.map((sector) => (
            <SectorCard key={sector.id} sector={sector} />
          ))}
        </div>
      )}
    </div>
  )
}
