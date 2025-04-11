import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, User } from "lucide-react"
import type { Sector } from "@/lib/types"

interface SectorCardProps {
  sector: Sector
}

export function SectorCard({ sector }: SectorCardProps) {
  return (
    <Link href={`/sector/${sector.id}`} className="block">
      <Card
        className={`${sector.completed ? "border-l-4 border-l-green-500" : ""} shadow-sm hover:shadow transition-shadow`}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">{sector.name}</h3>
            {sector.completed && (
              <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                Completado
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Encargado:</span>
              <span className="font-medium">{sector.manager}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Asistentes:</span>
              <span className="font-medium">{sector.attendees || 0}</span>
            </div>
            {sector.lastUpdated && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Actualizado:</span>
                <span className="font-medium">{formatDate(sector.lastUpdated)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
