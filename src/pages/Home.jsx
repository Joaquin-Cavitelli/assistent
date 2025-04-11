"use client"

import { useState, useEffect } from "react"
import { collection, onSnapshot, query } from "firebase/firestore"
import { db } from "../lib/firebase"
import { SectorCard } from "../components/SectorCard"
import { formatDate, formatTime } from "../lib/utils"
import { AlertCircle, Users, Clock } from "lucide-react"
import { Link } from "react-router-dom"
import { Header } from "../components/Header"

export default function Home() {
  const [sectors, setSectors] = useState([])
  const [config, setConfig] = useState({ startDateTime: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for sectors changes
    const sectorsQuery = query(collection(db, "sectors"))
    const unsubscribeSectors = onSnapshot(sectorsQuery, (snapshot) => {
      const sectorsData = []
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
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <Header />
      <div className="pt-16 px-4">
        <Link to="/admin">
          <div className="shadow-sm mb-4 hover:shadow transition-shadow rounded-lg border bg-white">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Hora de inicio:
                  </span>
                  <span className="text-xl font-bold">
                    {config.startDateTime ? formatTime(config.startDateTime) : "--:--"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {config.startDateTime ? formatDate(config.startDateTime) : "No configurado"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Total asistentes:
                  </span>
                  <span className="text-xl font-bold">{totalAttendees}</span>
                </div>
              </div>

              {!config.startDateTime && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md py-2 px-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <span className="text-xs text-yellow-800">No se ha configurado la fecha y hora de inicio.</span>
                </div>
              )}

              {allSectorsCompleted && sectors.length > 0 && (
                <div className="bg-green-50 text-green-800 border border-green-200 rounded-md py-2 px-3">
                  <span className="text-xs font-medium">¡Conteo completado! Total: {totalAttendees} asistentes.</span>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Progreso del conteo</span>
                  <span>
                    {completedSectors} de {sectors.length} sectores
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <h2 className="text-lg font-bold mb-3">Sectores</h2>

        {sectors.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md py-3 px-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <span className="text-sm">No hay sectores configurados. Acceda a Admin para agregar sectores.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {sectors.map((sector) => (
              <SectorCard key={sector.id} sector={sector} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
