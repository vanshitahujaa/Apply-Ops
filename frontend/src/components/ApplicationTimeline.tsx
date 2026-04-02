
import type { Application } from '@/lib/types'
import { Calendar, CheckCircle, Clock, Send, Target, XCircle } from 'lucide-react'

interface Props {
  application: Application
}

export default function ApplicationTimeline({ application }: Props) {
  const events = []

  // 1. Applied / Initial Sync
  events.push({
    id: 'applied',
    title: 'Application Sent',
    date: new Date(application.appliedAt),
    icon: Send,
    color: 'bg-zinc-700 text-zinc-300',
    description: `via ${application.platform || 'Email'}`,
  })

  // 2. Extracted Rounds
  if (application.rounds) {
    application.rounds.forEach((round) => {
      let icon = Calendar
      let color = 'bg-violet-500/20 text-violet-400'

      if (round.status === 'COMPLETED') {
        icon = CheckCircle
        color = 'bg-emerald-500/20 text-emerald-400'
      } else if (round.status === 'CANCELLED') {
        icon = XCircle
        color = 'bg-red-500/20 text-red-400'
      } else if (round.roundName.toLowerCase().includes('assessment') || round.roundName.toLowerCase().includes('coding')) {
        icon = Target
        color = 'bg-blue-500/20 text-blue-400'
      }

      events.push({
        id: `round-${round.id}`,
        title: round.roundName,
        date: new Date(round.scheduledAt),
        icon,
        color,
        description: round.meetingLink ? 'Meeting Link Attached' : (round.deadline ? `Due by ${new Date(round.deadline).toLocaleDateString()}` : ''),
      })
    })
  }

  // 3. Final Result (if any)
  if (application.status === 'offered') {
    events.push({
      id: 'offered',
      title: 'Offer Received!',
      date: new Date(application.updatedAt),
      icon: CheckCircle,
      color: 'bg-emerald-500 text-white',
    })
  } else if (application.status === 'rejected') {
    events.push({
      id: 'rejected',
      title: 'Rejected',
      date: new Date(application.updatedAt),
      icon: XCircle,
      color: 'bg-red-500/20 text-red-400',
    })
  } else if (application.status === 'withdrawn') {
    events.push({
      id: 'withdrawn',
      title: 'Withdrawn',
      date: new Date(application.updatedAt),
      icon: XCircle,
      color: 'bg-zinc-500/20 text-zinc-400',
    })
  }

  // Sort events chronologically
  events.sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="py-4">
      <h4 className="text-sm font-semibold text-white mb-4">Lifecycle Timeline</h4>
      <div className="relative pl-3">
        {/* Vertical line connecting events */}
        <div className="absolute left-6 top-2 bottom-2 w-px bg-zinc-800" />
        
        <div className="space-y-6">
          {events.map((event) => {
            const Icon = event.icon
            return (
              <div key={event.id} className="relative flex gap-4">
                <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${event.color} ring-4 ring-zinc-900 mt-0.5`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-zinc-100">{event.title}</h5>
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {event.date.toLocaleString(undefined, { 
                      weekday: 'short', month: 'short', day: 'numeric', 
                      hour: 'numeric', minute: '2-digit' 
                    })}
                  </p>
                  {event.description && (
                    <p className="text-xs text-zinc-400 mt-1">{event.description}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
