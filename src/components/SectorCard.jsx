import { Link } from "react-router-dom"
import { formatDate } from "../lib/utils"
import { Users, Clock, User } from "lucide-react"

export function SectorCard({ sector }) {
  return (
    <Link to={`/sector/${sector.id}`} className="block">
      <div
        className={`${
          sector.completed ? "border-l-4 border-l-green-500" : ""
        } shadow-sm hover:shadow transition-shadow rounded-lg border bg-white`}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">{sector.name}</h3>
            {sector.completed && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200">
                Completado
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-gray-500">Encargado:</span>
              <span className="font-medium">{sector.manager}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-gray-500">Asistentes:</span>
              <span className="font-medium">{sector.attendees || 0}</span>
            </div>
            {sector.lastUpdated && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-500">Actualizado:</span>
                <span className="font-medium">{formatDate(sector.lastUpdated)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
