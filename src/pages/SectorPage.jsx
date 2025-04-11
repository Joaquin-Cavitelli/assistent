"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { doc, updateDoc, onSnapshot } from "firebase/firestore"
import { db } from "../lib/firebase"
import { CountdownTimer } from "../components/CountdownTimer"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Header } from "../components/Header"

export default function SectorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sector, setSector] = useState(null)
  const [config, setConfig] = useState({ startDateTime: null })
  const [attendees, setAttendees] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [canCount, setCanCount] = useState(false)

  useEffect(() => {
    // Get sector data
    const sectorRef = doc(db, "sectors", id)
    const unsubscribeSector = onSnapshot(sectorRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setSector({
          id: docSnap.id,
          name: data.name,
          manager: data.manager,
          attendees: data.attendees || 0,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated.toDate()) : null,
          completed: !!data.completed,
        })
        setAttendees(data.attendees || 0)
      } else {
        setError("El sector no existe")
      }
      setLoading(false)
    })

    // Get config data
    const configRef = doc(db, "config", "eventConfig")
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        const startDateTime = data.startDateTime ? new Date(data.startDateTime.toDate()) : null
        setConfig({ startDateTime })

        // Check if current time is after start time
        if (startDateTime && new Date() >= startDateTime) {
          setCanCount(true)
        }
      }
    })

    return () => {
      unsubscribeSector()
      unsubscribeConfig()
    }
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!sector) return

    try {
      setSubmitting(true)
      const sectorRef = doc(db, "sectors", sector.id)

      await updateDoc(sectorRef, {
        attendees: attendees,
        lastUpdated: new Date(),
        completed: true,
      })

      navigate("/")
    } catch (err) {
      setError("Error al guardar los datos")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

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

  if (error || !sector) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md py-3 px-4 mb-4 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{error || "No se pudo cargar el sector"}</span>
        </div>
        <Link to="/">
          <button className="flex items-center gap-2 w-full py-2 px-4 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Header />
      <div className="pt-16">
        <Link to="/" className="inline-block mb-4">
          <button className="flex items-center gap-1 h-8 px-2 text-gray-700 hover:bg-gray-100 rounded-md">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </Link>

        <div className="shadow-sm rounded-lg border bg-white">
          <div className="p-4">
            <div className="mb-4">
              <h1 className="text-xl font-bold">{sector.name}</h1>
              <p className="text-sm text-gray-500">Encargado: {sector.manager}</p>
            </div>

            {!config.startDateTime ? (
              <div className="bg-blue-50 border border-blue-200 rounded-md py-2 px-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <span className="text-xs">No se ha configurado la fecha y hora de inicio.</span>
              </div>
            ) : !canCount ? (
              <CountdownTimer targetDate={config.startDateTime} onComplete={() => setCanCount(true)} />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="attendees" className="text-base block font-medium">
                    Número de asistentes
                  </label>
                  <input
                    id="attendees"
                    type="number"
                    min="0"
                    value={attendees}
                    onChange={(e) => setAttendees(Number.parseInt(e.target.value) || 0)}
                    required
                    className="text-lg h-12 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            )}
          </div>
          {canCount && (
            <div className="p-4 pt-0 border-t">
              <button
                className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Guardando...
                  </>
                ) : sector.completed ? (
                  "Actualizar conteo"
                ) : (
                  "Guardar conteo"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
