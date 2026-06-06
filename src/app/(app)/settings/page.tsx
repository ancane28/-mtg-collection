import { getCardStats } from './actions'
import { SyncButton } from '@/components/settings/SyncButton'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { count } = await getCardStats()
  const isEmpty = count === 0

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Impostazioni</h1>
      <p className="text-sm text-gray-400 mb-8">Configurazione e manutenzione del database locale</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Database carte</h2>
          <p className="text-sm text-gray-400">
            Scarica tutte le carte MTG da Scryfall (~27.000) e salvale localmente.
            <strong className="text-gray-300"> Non è necessaria</strong> per importare
            le decklist — l&apos;import funziona anche senza, usando direttamente
            l&apos;API Scryfall in batch. Utile solo per avere tutti i nomi carte
            disponibili offline.
          </p>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
          <div className={`w-2.5 h-2.5 rounded-full ${isEmpty ? 'bg-yellow-500' : 'bg-green-500'}`} />
          <span className="text-sm text-gray-300">
            {isEmpty
              ? 'Database vuoto — sincronizza prima di importare decklist'
              : `${count.toLocaleString('it-IT')} carte nel database locale`}
          </span>
        </div>

        <SyncButton />

        <p className="text-xs text-gray-600">
          Fonte: Scryfall oracle_cards bulk data (~26 MB, ~27.000 carte univoche).
          Ripeti la sync periodicamente per aggiornare le nuove uscite.
        </p>
      </div>
    </div>
  )
}
