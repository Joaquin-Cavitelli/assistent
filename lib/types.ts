export interface Sector {
  id: string
  name: string
  manager: string
  attendees: number
  lastUpdated: Date | null
  completed: boolean
}

export interface EventConfig {
  startDateTime: Date | null
}
