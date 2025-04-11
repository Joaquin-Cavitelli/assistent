import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | null): string {
  if (!date) return "No configurado"
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function formatTime(date: Date | null): string {
  if (!date) return "--:--"
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

// Modificar la función formatWhatsAppMessage para incluir fecha y hora
export function formatWhatsAppMessage(sectors: any[], startDateTime: Date | null): string {
  let message = "📊 *REPORTE DE ASISTENTES* 📊\n\n"

  // Agregar fecha y hora si están configuradas
  if (startDateTime) {
    const dateStr = new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(startDateTime)

    const timeStr = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(startDateTime)

    message += `📅 *Fecha:* ${dateStr}\n`
    message += `⏰ *Hora:* ${timeStr}\n\n`
  }

  let totalAttendees = 0
  sectors.forEach((sector) => {
    totalAttendees += sector.attendees || 0
    message += `*${sector.name}*\n`
    message += `👤 Encargado: ${sector.manager}\n`
    message += `🧑‍🤝‍🧑 Asistentes: ${sector.attendees || 0}\n\n`
  })

  message += `*TOTAL DE ASISTENTES: ${totalAttendees}*`
  return encodeURIComponent(message)
}
