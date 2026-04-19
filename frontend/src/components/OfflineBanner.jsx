import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-amber-300 text-sm">
      <WifiOff size={15} className="flex-shrink-0" />
      <span>Sin conexión — los datos mostrados pueden no estar actualizados</span>
    </div>
  )
}
