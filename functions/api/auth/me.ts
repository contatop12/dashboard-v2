import { json } from '../../_lib/json'
import type { UserRow } from '../../_lib/auth'

export async function onRequestGet(context: {
  data: { user?: UserRow | null }
}): Promise<Response> {
  const u = context.data.user
  if (!u) {
    return json({ user: null })
  }
  return json({
    user: {
      id: u.id,
      email: u.email,
      role: u.role,
      name: u.name,
    },
  })
}
