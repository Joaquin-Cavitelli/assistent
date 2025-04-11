"use client"
import { use } from "react"
import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, updateDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Sector, EventConfig } from "@/lib/types"
import { CountdownTimer } from "@/components/countdown-timer"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

export default function SectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [sector, setSector] = useState<Sector | null>(null)
  const [config, setConfig] = useState<EventConfig>({ startDateTime: null })
  const [attendees, setAttendees] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  const handleSubmit = async (e: React.FormEvent) => {
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

      router.push("/")
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
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (error || !sector) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "No se pudo cargar el sector"}</AlertDescription>
        </Alert>
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2 w-full">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Link href="/" className="inline-block mb-4">
        <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </Link>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="mb-4">
            <h1 className="text-xl font-bold">{sector.name}</h1>
            <p className="text-sm text-muted-foreground">Encargado: {sector.manager}</p>
          </div>

          {!config.startDateTime ? (
            <Alert className="py-2 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">No se ha configurado la fecha y hora de inicio.</AlertDescription>
            </Alert>
          ) : !canCount ? (
            <CountdownTimer targetDate={config.startDateTime} onComplete={() => setCanCount(true)} />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="attendees" className="text-base">
                  Número de asistentes
                </Label>
                <Input
                  id="attendees"
                  type="number"
                  min="0"
                  value={attendees}
                  onChange={(e) => setAttendees(Number.parseInt(e.target.value) || 0)}
                  required
                  className="text-lg h-12"
                />
              </div>
            </div>
          )}
        </CardContent>
        {canCount && (
          <CardFooter className="p-4 pt-0">
            <Button className="w-full h-12 text-base" onClick={handleSubmit} disabled={submitting}>
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
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
