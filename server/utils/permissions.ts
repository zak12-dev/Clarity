// server/utils/permissions.ts
import { ROLES } from '../constants/roles'

type Role = keyof typeof ROLES

export function canDelete(currentRole: Role, targetRole: Role) {
  return ROLES[currentRole] > ROLES[targetRole]
}

export function canChangeRole(currentRole: Role, targetRole: Role, newRole: Role) {
  // interdit de se modifier soi-même
  if (currentRole === targetRole) return false

  // on ne peut pas gérer quelqu’un de même niveau ou supérieur
  if (ROLES[currentRole] <= ROLES[targetRole]) return false

  // on ne peut pas promouvoir au-dessus de soi
  if (ROLES[newRole] >= ROLES[currentRole]) return false

  return true
}