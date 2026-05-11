import { useCallback, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Users, Plus, X, Pencil, Building2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'

export default function Clientes() {
  const { user } = useAuth()
  const { setActiveOrgId, refreshOrgs } = useOrgWorkspace()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ organizationName: '', name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState({
    organizationName: '',
    name: '',
    email: '',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/users', { credentials: 'include' })
      if (!r.ok) throw new Error('list')
      const data = await r.json()
      setClients(data.clients ?? [])
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'super_admin') load()
  }, [user, load])

  function openEdit(row) {
    setEditRow(row)
    setEditForm({
      organizationName: row.org_name || '',
      name: row.name || '',
      email: row.email || '',
      password: '',
    })
    setEditError('')
    setEditOpen(true)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editRow) return
    setEditError('')
    setSaving(true)
    try {
      const body = {
        user_id: editRow.user_id,
        organizationName: editForm.organizationName.trim(),
        name: editForm.name.trim() || null,
        email: editForm.email.trim(),
      }
      if (editForm.password.trim()) {
        body.password = editForm.password.trim()
      }
      const r = await fetch('/api/admin/users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Falha ao salvar')
      setEditOpen(false)
      setEditRow(null)
      await load()
      await refreshOrgs()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setInvite(null)
    setCreating(true)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Falha ao criar')
      setInvite(data)
      setForm({ organizationName: '', name: '', email: '', password: '' })
      await load()
      await refreshOrgs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setCreating(false)
    }
  }

  if (user?.role !== 'super_admin') {
    return (
      <div className="py-8 text-sm text-muted-foreground font-sans">
        Acesso restrito a super administradores.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-8 py-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-white font-display font-semibold text-sm">
            <Users size={16} className="text-brand" />
            Clientes
          </div>
          <p className="text-xs text-muted-foreground font-sans mt-1 max-w-lg">
            Organizações com usuário cliente (owner). Edite nome da organização, dados do usuário ou redefina senha.
          </p>
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-brand text-[#0F0F0F] text-xs font-semibold px-4 py-2 rounded-md hover:bg-brand/90 font-sans shrink-0"
            >
              <Plus size={14} />
              Criar cliente
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[100]" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(100vw-2rem,420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-[#141414] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-sm font-display font-semibold text-white">
                  Novo cliente
                </Dialog.Title>
                <Dialog.Close className="text-muted-foreground hover:text-white p-1 rounded-md">
                  <X size={16} />
                </Dialog.Close>
              </div>
              <form onSubmit={handleCreate} className="flex flex-col gap-3">
                {[
                  ['organizationName', 'Nome da organização', 'text'],
                  ['name', 'Nome do usuário (opcional)', 'text'],
                  ['email', 'E-mail do cliente', 'email'],
                  ['password', 'Senha temporária', 'password'],
                ].map(([key, label, type]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase text-muted-foreground font-sans">{label}</label>
                    <input
                      required={key !== 'name'}
                      type={type}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50 font-sans"
                    />
                  </div>
                ))}
                {error && <p className="text-xs text-red-400 font-sans">{error}</p>}
                {invite && (
                  <div className="rounded-lg border border-brand/30 bg-brand/10 p-3 text-xs text-brand font-sans space-y-2">
                    <p>
                      <strong>Convite (Onda 1):</strong> envie o e-mail <strong>{invite.user?.email}</strong> e a senha
                      temporária que você definiu.
                    </p>
                    <p className="text-[11px] opacity-90">{invite.inviteNote}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={creating}
                  className="mt-2 bg-brand text-[#0F0F0F] text-sm font-semibold py-2 rounded-md disabled:opacity-60 font-sans"
                >
                  {creating ? 'Criando…' : 'Criar'}
                </button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[100]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(100vw-2rem,420px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-[#141414] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-sm font-display font-semibold text-white">Editar cliente</Dialog.Title>
              <Dialog.Close className="text-muted-foreground hover:text-white p-1 rounded-md">
                <X size={16} />
              </Dialog.Close>
            </div>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
              {[
                ['organizationName', 'Nome da organização', 'text'],
                ['name', 'Nome do usuário', 'text'],
                ['email', 'E-mail', 'email'],
                ['password', 'Nova senha (opcional)', 'password'],
              ].map(([key, label, type]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase text-muted-foreground font-sans">{label}</label>
                  <input
                    required={key === 'email' || key === 'organizationName'}
                    type={type}
                    value={editForm[key]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50 font-sans"
                  />
                </div>
              ))}
              {editError && <p className="text-xs text-red-400 font-sans">{editError}</p>}
              <button
                type="submit"
                disabled={saving}
                className="mt-2 bg-brand text-[#0F0F0F] text-sm font-semibold py-2 rounded-md disabled:opacity-60 font-sans"
              >
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground font-sans">Carregando…</p>
        ) : clients.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground font-sans">Nenhum cliente cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs font-sans">
              <thead className="border-b border-surface-border text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-medium">Organização</th>
                  <th className="px-5 py-3 font-medium">Usuário</th>
                  <th className="px-5 py-3 font-medium">E-mail</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((row) => (
                  <tr key={row.user_id} className="border-b border-surface-border/60 last:border-0 hover:bg-surface-hover/30">
                    <td className="px-5 py-3.5 text-white">{row.org_name || '—'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{row.name || '—'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{row.email}</td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {row.org_id && (
                        <button
                          type="button"
                          onClick={() => setActiveOrgId(row.org_id)}
                          className="mr-2 inline-flex items-center gap-1 rounded-md border border-surface-border px-2 py-1 text-[10px] text-muted-foreground hover:border-brand/40 hover:text-brand"
                          title="Selecionar esta organização no dashboard"
                        >
                          <Building2 size={11} />
                          Usar org
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 rounded-md border border-surface-border px-2 py-1 text-[10px] text-white hover:border-brand/40 hover:text-brand"
                      >
                        <Pencil size={11} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
