import Link from "next/link"
import { Users } from "lucide-react"

export function Header() {
  return (
    <header className="border-b bg-white fixed top-0 left-0 right-0 z-10">
      <div className="flex h-14 items-center px-4 justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Users className="h-5 w-5" />
          <span>Contador</span>
        </Link>
        <Link href="/admin" className="text-sm font-medium">
          Admin
        </Link>
      </div>
    </header>
  )
}
