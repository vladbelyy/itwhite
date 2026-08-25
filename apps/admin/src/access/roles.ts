import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

export const userRoles = ['owner', 'admin', 'editor', 'sales'] as const
export type UserRole = (typeof userRoles)[number]

type AuthUser = PayloadRequest['user'] & { roles?: UserRole[] }

export const getRoles = (user: PayloadRequest['user']): UserRole[] => {
  if (!user || !Array.isArray((user as AuthUser).roles)) return []

  return (user as AuthUser).roles!.filter((role): role is UserRole =>
    userRoles.includes(role),
  )
}

export const hasRole = (user: PayloadRequest['user'], allowed: readonly UserRole[]) =>
  getRoles(user).some((role) => allowed.includes(role))

export const allowRoles = (...allowed: UserRole[]): Access =>
  ({ req }) => hasRole(req.user, allowed)

export const allowFieldRoles = (...allowed: UserRole[]): FieldAccess =>
  ({ req }) => hasRole(req.user, allowed)

export const ownerOrAdmin = allowRoles('owner', 'admin')
export const ownerOnly = allowRoles('owner')
export const contentTeam = allowRoles('owner', 'admin', 'editor')
export const salesTeam = allowRoles('owner', 'admin', 'sales')

export const contentWrite: Access = ({ data, req }) => {
  if (!hasRole(req.user, ['owner', 'admin', 'editor'])) return false
  if (data?._status === 'published') return hasRole(req.user, ['owner', 'admin'])

  return true
}

export const ownerAdminOrSelf: Access = ({ req }): boolean | Where => {
  if (hasRole(req.user, ['owner', 'admin'])) return true
  if (!req.user?.id) return false

  return { id: { equals: req.user.id } }
}
