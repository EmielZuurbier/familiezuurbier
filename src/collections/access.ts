import type { Access } from 'payload'
export const administrator: Access = ({ req }) => req.user?.collection === 'administrators'
export const familyRead: Access = ({ req }) =>
  req.user?.collection === 'administrators' ||
  (req.user?.collection === 'family-members' && req.user.status === 'active')
export const familyAccess = {
  read: familyRead,
  create: administrator,
  update: administrator,
  delete: administrator,
}
