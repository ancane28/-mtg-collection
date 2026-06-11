import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen text-gray-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto scrollbar-thin pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
