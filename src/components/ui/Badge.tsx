import { cn } from '@/lib/utils'

type BadgeVariant = 'real' | 'proxy' | 'overcommit' | 'available' | 'neutral'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  real:       'bg-green-900/60  text-green-300  border border-green-800/80',
  proxy:      'bg-red-900/60    text-red-300    border border-red-800/80',
  overcommit: 'bg-orange-900/60 text-orange-300 border border-orange-800/80',
  available:  'bg-blue-900/60   text-blue-300   border border-blue-800/80',
  neutral:    'bg-gray-800      text-gray-400   border border-gray-700',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
