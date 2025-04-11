"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Sector, EventConfig } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDate, formatWhatsAppMessage } from "@/lib/utils"
import {
  CalendarIcon,
  Clock,
  Edit,
  Plus,
  PhoneIcon as WhatsappIcon,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [sectors, setSectors] = useState<Sector[]>([])
  const [config, setConfig] = useState<EventConfig>({ startDateTime: null })
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetStatus, setResetStatus] = useState("")

  // Form states
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("")
  const [newSectorName, setNewSectorName] = useState("")
  const [newSectorManager, setNewSectorManager] = useState("")
  const [editingSector, setEditingSector] = useState<Sector | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddSectorDialogOpen, setIsAddSectorDialogOpen] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    const auth = localStorage.getItem("adminAuth")
    if (auth === "true") {
      setIsAuthenticated(true)
    }

    if (isAuthenticated) {
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
      })

      // Listen for config changes
      const configRef = doc(db, "config", "eventConfig")
      const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          const startDateTime = data.startDateTime ? new Date(data.startDateTime.toDate()) : null
          setConfig({ startDateTime })

          if (startDateTime) {
            setDate(startDateTime)
            setTime(format(startDateTime, "HH:mm"))
          } else {
            setDate(undefined)
            setTime("")
          }
        }
      })

      return () => {
        unsubscribeSectors()
        unsubscribeConfig()
      }
    }
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()

    if (username === "admin" && password === "admin123") {
      localStorage.setItem("adminAuth", "true")
      setIsAuthenticated(true)
      setLoginError("")
    } else {
      setLoginError("Usuario o contraseña incorrectos")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    setIsAuthenticated(false)
  }

  const saveDateTime = async () => {
    if (!date || !time) return

    const [hours, minutes] = time.split(":").map(Number)
    const startDateTime = new Date(date)
    startDateTime.setHours(hours, minutes)

    try {
      await setDoc(doc(db, "config", "eventConfig"), {
        startDateTime: startDateTime,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error saving date/time:", error)
    }
  }

  const addSector = async () => {
    if (!newSectorName || !newSectorManager) return

    try {
      const newSectorRef = doc(collection(db, "sectors"))
      await setDoc(newSectorRef, {
        name: newSectorName,
        manager: newSectorManager,
        attendees: 0,
        completed: false,
        createdAt: serverTimestamp(),
      })

      setNewSectorName("")
      setNewSectorManager("")
    } catch (error) {
      console.error("Error adding sector:", error)
    }
  }

  const updateSector = async () => {
    if (!editingSector || !editingSector.name || !editingSector.manager) return

    try {
      await setDoc(
        doc(db, "sectors", editingSector.id),
        {
          name: editingSector.name,
          manager: editingSector.manager,
          attendees: editingSector.attendees || 0,
          completed: editingSector.completed,
          lastUpdated: editingSector.lastUpdated,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      setEditingSector(null)
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error updating sector:", error)
    }
  }

  const deleteSector = async (id: string) => {
    try {
      await deleteDoc(doc(db, "sectors", id))
    } catch (error) {
      console.error("Error deleting sector:", error)
    }
  }

  const resetConfiguration = async () => {
    try {
      setIsResetting(true)
      setResetStatus("Iniciando reinicio...")

      // 1. Primero reiniciar la configuración de fecha/hora
      setResetStatus("Reiniciando configuración de fecha/hora...")
      await updateDoc(doc(db, "config", "eventConfig"), {
        startDateTime: null,
      })

      // 2. Reiniciar cada sector uno por uno
      for (let i = 0; i < sectors.length; i++) {
        const sector = sectors[i]
        setResetStatus(`Reiniciando sector ${i + 1} de ${sectors.length}: ${sector.name}...`)

        await updateDoc(doc(db, "sectors", sector.id), {
          attendees: 0,
          completed: false,
          lastUpdated: null,
        })
      }

      setResetStatus("¡Reinicio completado!")
      setTimeout(() => {
        setIsResetDialogOpen(false)
        setIsResetting(false)
        setResetStatus("")
      }, 1000)
    } catch (error) {
      console.error("Error al reiniciar:", error)
      setResetStatus(`Error: ${error.message}`)
      setTimeout(() => {
        setIsResetting(false)
      }, 3000)
    }
  }

  const generateWhatsAppReport = () => {
    const message = formatWhatsAppMessage(sectors, config.startDateTime)
    const whatsappUrl = `https://wa.me/?text=${message}`
    window.open(whatsappUrl, "_blank")
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="w-full shadow-sm">
          <CardContent className="p-4">
            <h1 className="text-xl font-bold mb-4">Acceso Admin</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <Button type="submit" className="w-full h-12">
                Iniciar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-1 h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8">
          Salir
        </Button>
      </div>

      <h1 className="text-lg font-bold mb-4">Panel de Admin</h1>

      <Tabs defaultValue="datetime" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="datetime" className="text-xs">
            Configuración
          </TabsTrigger>
          <TabsTrigger value="sectors" className="text-xs">
            Sectores
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs">
            Reporte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datetime">
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fecha y hora actual</Label>
                <div className="text-sm font-medium">
                  {config.startDateTime ? formatDate(config.startDateTime) : "No configurada"}
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-12">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(selectedDate) => {
                          setDate(selectedDate)
                          // Cerrar el popover automáticamente
                          document.body.click()
                        }}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <div className="flex items-center">
                    <Clock className="absolute ml-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="pl-10 h-12"
                      onBlur={() => {
                        // Cerrar cualquier popover abierto
                        document.body.click()
                      }}
                    />
                  </div>
                </div>

                <Button onClick={saveDateTime} disabled={!date || !time} className="w-full h-12">
                  Guardar fecha y hora
                </Button>

                <div className="pt-4 border-t mt-4">
                  <h3 className="font-medium mb-2">Reiniciar configuración</h3>
                  <Alert className="py-3 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Esta acción reiniciará todos los conteos de asistentes y el estado de los sectores.
                    </AlertDescription>
                  </Alert>

                  <Button
                    variant="outline"
                    className="w-full h-12 flex items-center gap-2 border-dashed border-red-200 text-red-600"
                    onClick={() => setIsResetDialogOpen(true)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reiniciar todo
                  </Button>

                  <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <DialogContent className="sm:max-w-[425px] w-[calc(100vw-32px)] p-0 flex flex-col">
                      <DialogHeader className="p-4 border-b">
                        <DialogTitle>¿Está seguro?</DialogTitle>
                      </DialogHeader>
                      <div className="p-4">
                        {isResetting ? (
                          <div className="text-center py-4">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-sm">{resetStatus}</p>
                          </div>
                        ) : (
                          <p className="text-sm mb-4">
                            Esta acción reiniciará todos los conteos y configuraciones. No se puede deshacer.
                          </p>
                        )}
                      </div>
                      <div className="p-4 border-t flex flex-col gap-2">
                        {!isResetting && (
                          <>
                            <Button onClick={resetConfiguration} className="w-full h-12 bg-red-600 hover:bg-red-700">
                              Sí, reiniciar todo
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsResetDialogOpen(false)}
                              className="w-full h-12"
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sectors">
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-4">
              <Button onClick={() => setIsAddSectorDialogOpen(true)} className="w-full h-12 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar sector
              </Button>

              <div className="space-y-3 pt-2">
                <h3 className="font-medium">Sectores ({sectors.length})</h3>

                {sectors.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">No hay sectores configurados</p>
                ) : (
                  <div className="space-y-2">
                    {sectors.map((sector) => (
                      <div key={sector.id} className="flex items-center justify-between p-3 bg-white border rounded-md">
                        <div>
                          <div className="font-medium">{sector.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {sector.manager} • {sector.attendees || 0} asistentes
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingSector(sector)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Modal para agregar sector */}
          <Dialog open={isAddSectorDialogOpen} onOpenChange={setIsAddSectorDialogOpen}>
            <DialogContent className="sm:max-w-[425px] w-[calc(100vw-32px)] p-0 h-[80vh] sm:h-auto flex flex-col">
              <DialogHeader className="p-4 border-b">
                <DialogTitle>Agregar Sector</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sectorName">Nombre del sector</Label>
                  <Input
                    id="sectorName"
                    value={newSectorName}
                    onChange={(e) => setNewSectorName(e.target.value)}
                    placeholder="Ej: Sector A"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sectorManager">Encargado</Label>
                  <Input
                    id="sectorManager"
                    value={newSectorManager}
                    onChange={(e) => setNewSectorManager(e.target.value)}
                    placeholder="Nombre del encargado"
                    className="h-12"
                  />
                </div>
              </div>
              <div className="p-4 border-t mt-auto">
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      addSector()
                      setIsAddSectorDialogOpen(false)
                    }}
                    disabled={!newSectorName || !newSectorManager}
                    className="w-full h-12"
                  >
                    Guardar
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddSectorDialogOpen(false)} className="w-full h-12">
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal para editar sector */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px] w-[calc(100vw-32px)] p-0 h-[80vh] sm:h-auto flex flex-col">
              <DialogHeader className="p-4 border-b">
                <DialogTitle>Editar Sector</DialogTitle>
              </DialogHeader>
              {editingSector && (
                <>
                  <div className="flex-1 overflow-auto p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editSectorName">Nombre del sector</Label>
                      <Input
                        id="editSectorName"
                        value={editingSector.name}
                        onChange={(e) => setEditingSector({ ...editingSector, name: e.target.value })}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editSectorManager">Encargado</Label>
                      <Input
                        id="editSectorManager"
                        value={editingSector.manager}
                        onChange={(e) => setEditingSector({ ...editingSector, manager: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>
                  <div className="p-4 border-t mt-auto">
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          updateSector()
                          setIsDialogOpen(false)
                        }}
                        className="w-full h-12"
                      >
                        Guardar
                      </Button>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full h-12">
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          deleteSector(editingSector.id)
                          setIsDialogOpen(false)
                        }}
                        className="w-full h-12"
                      >
                        Eliminar sector
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="report">
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                {sectors.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">No hay sectores para generar reporte</p>
                ) : (
                  <div className="space-y-2">
                    {sectors.map((sector) => (
                      <div key={sector.id} className="flex items-center justify-between p-3 bg-white border rounded-md">
                        <div>
                          <div className="font-medium">{sector.name}</div>
                          <div className="text-xs text-muted-foreground">{sector.manager}</div>
                        </div>
                        <div className="text-lg font-bold">{sector.attendees || 0}</div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between p-3 bg-gray-100 border rounded-md mt-4">
                      <div className="font-bold">Total</div>
                      <div className="text-lg font-bold">
                        {sectors.reduce((sum, sector) => sum + (sector.attendees || 0), 0)}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={generateWhatsAppReport}
                  className="w-full h-12 flex items-center gap-2 mt-4"
                  disabled={sectors.length === 0}
                >
                  <WhatsappIcon className="h-4 w-4" />
                  Compartir por WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
