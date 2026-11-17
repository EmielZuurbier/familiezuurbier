import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { createLocalReq, type Payload } from 'payload'
import { relationLock } from '../../src/collections/collections'
import { readFamilyRelations } from '../../src/collections/family-data'
import { effectiveParentages, planPartnershipChildren, relationKey } from '../../src/lib/relations'
export async function convertPartnershipChildren(
  payload: Payload,
  options: { apply?: boolean; backupDir?: string } = {},
) {
  const req = await createLocalReq({}, payload)
  req.transactionID = (await payload.db.beginTransaction()) ?? undefined
  if (!req.transactionID) throw new Error('De omzetting vereist een databasetransactie.')
  try {
    await relationLock(req)
    const before = await readFamilyRelations(req)
    const keys = (family: typeof before) =>
      effectiveParentages(family.manual, family.partnerships)
        .map((r) => relationKey(r.parent, r.child))
        .sort()
    const originalKeys = JSON.stringify(keys(before)),
      plan = planPartnershipChildren(before.manual, before.partnerships)
    let backupFile: string | undefined
    if (options.apply && plan.children > 0) {
      const folder = path.resolve(options.backupDir ?? '.local-migrations')
      await mkdir(folder, { recursive: true, mode: 0o700 })
      backupFile = path.join(
        folder,
        `children-before-${Date.now()}-${randomBytes(4).toString('hex')}.json`,
      )
      await writeFile(
        backupFile,
        JSON.stringify(
          {
            schemaVersion: 1,
            purpose: 'Relaties vóór omzetting naar gezamenlijke kinderen; privé herstelbestand.',
            createdAt: new Date().toISOString(),
            ...before,
          },
          null,
          2,
        ),
        { mode: 0o600, flag: 'wx' },
      )
      for (const pair of plan.updates)
        await payload.update({
          collection: 'partnerships',
          id: Number(pair.id),
          data: { children: pair.children.map(Number) },
          overrideAccess: true,
          req,
        })
      for (const id of plan.removeIds)
        await payload.delete({
          collection: 'parentages',
          id: Number(id),
          overrideAccess: true,
          req,
        })
      const after = await readFamilyRelations(req)
      if (JSON.stringify(keys(after)) !== originalKeys)
        throw new Error(
          'Omzetting afgebroken: de familieverbindingen zouden veranderen. Er is niets vastgelegd.',
        )
    }
    if (options.apply) await payload.db.commitTransaction(req.transactionID)
    else await payload.db.rollbackTransaction(req.transactionID)
    return {
      applied: !!options.apply,
      jointChildren: plan.children,
      partnerships: plan.updates.length,
      individualRowsReplaced: plan.removeIds.length,
      unresolvedChildren: plan.unresolved,
      backupFile,
    }
  } catch (error) {
    await payload.db.rollbackTransaction(req.transactionID)
    throw error
  }
}
