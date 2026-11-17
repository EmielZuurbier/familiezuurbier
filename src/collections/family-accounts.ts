import type { CollectionConfig, Field } from 'payload'
import { familyStrategy } from '../lib/family-auth/strategy'

const deny = () => false
const privateAccess = { create: deny, read: deny, update: deny, delete: deny }
const secret = (name: string, type: 'text' | 'date' | 'number'): Field => {
  const base = { name, hidden: true, access: { read: deny, create: deny, update: deny } }
  if (type === 'number') return { ...base, type: 'number' }
  if (type === 'date') return { ...base, type: 'date' }
  return { ...base, type: 'text' }
}
export const FamilyMembers: CollectionConfig = {
  slug: 'family-members',
  labels: { singular: 'Familieaccount', plural: 'Familieaccounts' },
  auth: { disableLocalStrategy: true, strategies: [familyStrategy], useSessions: false },
  admin: { hidden: true, useAsTitle: 'name' },
  access: { ...privateAccess, admin: deny },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, unique: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'invited',
      options: ['invited', 'active', 'revoked'],
    },
    { name: 'authVersion', type: 'number', required: true, defaultValue: 1 },
    { name: 'invitedAt', type: 'date' },
    { name: 'activatedAt', type: 'date' },
    { name: 'lastLoginAt', type: 'date' },
    secret('inviteHash', 'text'),
    secret('inviteExpiresAt', 'date'),
    secret('codeHash', 'text'),
    secret('codeExpiresAt', 'date'),
    secret('codeAttempts', 'number'),
    secret('codeSentAt', 'date'),
    { name: 'mailFailed', type: 'checkbox', defaultValue: false },
  ],
}
export const FamilySessions: CollectionConfig = {
  slug: 'family-sessions',
  admin: { hidden: true },
  access: privateAccess,
  fields: [
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'family-members',
      required: true,
      index: true,
    },
    { name: 'tokenHash', type: 'text', required: true, unique: true },
    { name: 'authVersion', type: 'number', required: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
export const FamilyRateLimits: CollectionConfig = {
  slug: 'family-rate-limits',
  admin: { hidden: true },
  access: privateAccess,
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'count', type: 'number', required: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
