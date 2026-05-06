import type { UserRow } from './auth'
import { jsonError } from './json'

export function requireSuperAdmin(user: UserRow | null | undefined): Response | null {
  if (!user) return jsonError('Não autorizado', 401)
  if (user.role !== 'super_admin') return jsonError('Apenas super administrador', 403)
  return null
}
