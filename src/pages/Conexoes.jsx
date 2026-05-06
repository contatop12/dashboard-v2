import { Plug } from 'lucide-react'

const CHANNELS = [
  { id: 'meta_ads', title: 'Meta Ads', desc: 'Campanhas e conjuntos no Facebook / Instagram Ads.' },
  { id: 'google_ads', title: 'Google Ads', desc: 'Busca, Display, Performance Max e PMax.' },
  { id: 'gmb', title: 'Google Meu Negócio', desc: 'Locais, avaliações e insights locais.' },
  { id: 'instagram', title: 'Instagram Business', desc: 'Conteúdo orgânico e métricas da conta.' },
]

export default function Conexoes() {
  return (
    <div className="max-w-3xl flex flex-col gap-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 text-white font-display font-semibold text-sm">
          <Plug size={16} className="text-brand" />
          Conexões
        </div>
        <p className="text-xs text-muted-foreground font-sans mt-1">
          Conecte canais de anúncios e redes. Na Onda 1 os botões ficam desabilitados.
        </p>
      </div>

      <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
        <p className="text-xs text-brand font-sans">
          Nenhuma conta conectada ainda. OAuth e fluxo de autorização chegam na próxima onda.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CHANNELS.map((c) => (
          <div
            key={c.id}
            className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-3"
          >
            <div>
              <h3 className="text-sm font-semibold text-white font-display">{c.title}</h3>
              <p className="text-[11px] text-muted-foreground font-sans mt-1">{c.desc}</p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">Estado: desconectado</span>
            <button
              type="button"
              disabled
              title="Disponível em breve"
              className="mt-auto text-xs font-semibold px-3 py-2 rounded-md border border-surface-border text-muted-foreground cursor-not-allowed opacity-60"
            >
              Conectar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
