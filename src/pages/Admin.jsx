"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import { formatDate, formatWhatsAppMessage } from "../lib/utils"
import { CalendarIcon, Clock, Edit, Plus, AlertCircle, ArrowLeft, RotateCcw } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Header } from "../components/Header"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [sectors, setSectors] = useState([])
  const [config, setConfig] = useState({ startDateTime: null })
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetStatus, setResetStatus] = useState("")
  const [activeTab, setActiveTab] = useState("datetime")

  // Form states
  const [date, setDate] = useState(undefined)
  const [time, setTime] = useState("")
  const [newSectorName, setNewSectorName] = useState("")
  const [newSectorManager, setNewSectorManager] = useState("")
  const [editingSector, setEditingSector] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddSectorDialogOpen, setIsAddSectorDialogOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

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

  const handleLogin = (e) => {
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

  const deleteSector = async (id) => {
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

  const handleDateChange = (selectedDate) => {
    setDate(selectedDate)
    setIsCalendarOpen(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="w-full shadow-sm rounded-lg border bg-white">
          <div className="p-4">
            <h1 className="text-xl font-bold mb-4">Acceso Admin</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md py-2 px-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="username" className="block font-medium">
                  Usuario
                </label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-12 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="block font-medium">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <button type="submit" className="w-full h-12 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Iniciar sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Header />
      <div className="pt-16">
        <div className="flex justify-between items-center mb-4">
          <Link to="/">
            <button className="flex items-center gap-1 h-8 px-2 text-gray-700 hover:bg-gray-100 rounded-md">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          </Link>
          <button className="h-8 px-2 text-gray-700 hover:bg-gray-100 rounded-md" onClick={handleLogout}>
            Salir
          </button>
        </div>

        <h1 className="text-lg font-bold mb-4">Panel de Admin</h1>

        <div className="space-y-4">
          <div className="grid w-full grid-cols-3 h-10 bg-gray-100 rounded-lg p-1">
            <button
              className={`text-xs rounded-md ${activeTab === "datetime" ? "bg-white shadow" : "hover:bg-gray-200"}`}
              onClick={() => setActiveTab("datetime")}
            >
              Configuración
            </button>
            <button
              className={`text-xs rounded-md ${activeTab === "sectors" ? "bg-white shadow" : "hover:bg-gray-200"}`}
              onClick={() => setActiveTab("sectors")}
            >
              Sectores
            </button>
            <button
              className={`text-xs rounded-md ${activeTab === "report" ? "bg-white shadow" : "hover:bg-gray-200"}`}
              onClick={() => setActiveTab("report")}
            >
              Reporte
            </button>
          </div>

          {activeTab === "datetime" && (
            <div className="shadow-sm rounded-lg border bg-white">
              <div className="p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 block">Fecha y hora actual</label>
                  <div className="text-sm font-medium">
                    {config.startDateTime ? formatDate(config.startDateTime) : "No configurada"}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="block font-medium">Fecha</label>
                    <div className="relative">
                      <button
                        className="w-full justify-start text-left font-normal h-12 px-3 py-2 border border-gray-300 rounded-md flex items-center"
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                      </button>
                      {isCalendarOpen && (
                        <div className="absolute z-10 mt-1 bg-white border rounded-md shadow-lg p-2">
                          {/* Simplified calendar - in a real app you'd use a proper calendar component */}
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 31 }, (_, i) => {
                              const day = new Date()
                              day.setDate(i + 1)
                              return (
                                <button
                                  key={i}
                                  className="h-8 w-8 rounded-full hover:bg-gray-100"
                                  onClick={() => handleDateChange(day)}
                                >
                                  {i + 1}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="time" className="block font-medium">
                      Hora
                    </label>
                    <div className="flex items-center relative">
                      <Clock className="absolute left-3 h-4 w-4 text-gray-500" />
                      <input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="pl-10 h-12 w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <button
                    onClick={saveDateTime}
                    disabled={!date || !time}
                    className="w-full h-12 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Guardar fecha y hora
                  </button>

                  <div className="pt-4 border-t mt-4">
                    <h3 className="font-medium mb-2">Reiniciar configuración</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md py-3 px-4 mb-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <span className="text-sm text-yellow-800">
                        Esta acción reiniciará todos los conteos de asistentes y el estado de los sectores.
                      </span>
                    </div>

                    <button
                      className="w-full h-12 flex items-center justify-center gap-2 border border-dashed border-red-200 text-red-600 rounded-md hover:bg-red-50"
                      onClick={() => setIsResetDialogOpen(true)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reiniciar todo
                    </button>

                    {isResetDialogOpen && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-md w-full">
                          <div className="p-4 border-b">
                            <h3 className="font-bold">¿Está seguro?</h3>
                          </div>
                          <div className="p-4">
                            {isResetting ? (
                              <div className="text-center py-4">
                                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
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
                                <button
                                  onClick={resetConfiguration}
                                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-md"
                                >
                                  Sí, reiniciar todo
                                </button>
                                <button
                                  onClick={() => setIsResetDialogOpen(false)}
                                  className="w-full h-12 border border-gray-300 rounded-md"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sectors" && (
            <div className="shadow-sm rounded-lg border bg-white">
              <div className="p-4 space-y-4">
                <button
                  onClick={() => setIsAddSectorDialogOpen(true)}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  <Plus className="h-4 w-4" />
                  Agregar sector
                </button>

                <div className="space-y-3 pt-2">
                  <h3 className="font-medium">Sectores ({sectors.length})</h3>

                  {sectors.length === 0 ? (
                    <p className="text-center py-4 text-sm text-gray-500">No hay sectores configurados</p>
                  ) : (
                    <div className="space-y-2">
                      {sectors.map((sector) => (
                        <div
                          key={sector.id}
                          className="flex items-center justify-between p-3 bg-white border rounded-md"
                        >
                          <div>
                            <div className="font-medium">{sector.name}</div>
                            <div className="text-xs text-gray-500">
                              {sector.manager} • {sector.attendees || 0} asistentes
                            </div>
                          </div>
                          <button
                            className="h-8 w-8 text-gray-500 hover:bg-gray-100 rounded-full flex items-center justify-center"
                            onClick={() => {
                              setEditingSector(sector)
                              setIsDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "report" && (
            <div className="shadow-sm rounded-lg border bg-white">
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  {sectors.length === 0 ? (
                    <p className="text-center py-4 text-sm text-gray-500">No hay sectores para generar reporte</p>
                  ) : (
                    <div className="space-y-2">
                      {sectors.map((sector) => (
                        <div
                          key={sector.id}
                          className="flex items-center justify-between p-3 bg-white border rounded-md"
                        >
                          <div>
                            <div className="font-medium">{sector.name}</div>
                            <div className="text-xs text-gray-500">{sector.manager}</div>
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

                  <button
                    onClick={generateWhatsAppReport}
                    className="w-full h-12 flex items-center justify-center gap-2 bg-green-500 text-white rounded-md hover:bg-green-600 mt-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    disabled={sectors.length === 0}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    Compartir por WhatsApp
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal para agregar sector */}
        {isAddSectorDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full h-auto max-h-[80vh] flex flex-col">
              <div className="p-4 border-b">
                <h3 className="font-bold">Agregar Sector</h3>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="sectorName" className="block font-medium">
                    Nombre del sector
                  </label>
                  <input
                    id="sectorName"
                    value={newSectorName}
                    onChange={(e) => setNewSectorName(e.target.value)}
                    placeholder="Ej: Sector A"
                    className="h-12 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="sectorManager" className="block font-medium">
                    Encargado
                  </label>
                  <input
                    id="sectorManager"
                    value={newSectorManager}
                    onChange={(e) => setNewSectorManager(e.target.value)}
                    placeholder="Nombre del encargado"
                    className="h-12 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="p-4 border-t mt-auto">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      addSector()
                      setIsAddSectorDialogOpen(false)
                    }}
                    disabled={!newSectorName || !newSectorManager}
                    className="w-full h-12 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setIsAddSectorDialogOpen(false)}
                    className="w-full h-12 border border-gray-300 rounded-md"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal para editar sector */}
        {isDialogOpen && editingSector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full h-auto max-h-[80vh] flex flex-col">
              <div className="p-4 border-b">
                <h3 className="font-bold">Editar Sector</h3>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="editSectorName" className="block font-medium">
                    Nombre del sector
                  </label>
                  <input
                    id="editSectorName"
                    value={editingSector.name}
                    onChange={(e) => setEditingSector({ ...editingSector, name: e.target.value })}
                    className="h-12 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="editSectorManager" className="block font-medium">
                    Encargado
                  </label>
                  <input
                    id="editSectorManager"
                    value={editingSector.manager}
                    onChange={(e) => setEditingSector({ ...editingSector, manager: e.target.value })}
                    className="h-12 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="p-4 border-t mt-auto">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      updateSector()
                      setIsDialogOpen(false)
                    }}
                    className="w-full h-12 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full h-12 border border-gray-300 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      deleteSector(editingSector.id)
                      setIsDialogOpen(false)
                    }}
                    className="w-full h-12 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Eliminar sector
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
