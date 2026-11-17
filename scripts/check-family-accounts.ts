import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import {
  acceptInvitation,
  inviteMember,
  listMembers,
  logoutSession,
  requestCode,
  revokeMember,
  verifyCode,
} from '../src/lib/family-auth/service'
import { cookieName, normalizeEmail, secretHash } from '../src/lib/family-auth/primitives'

// Select a fresh, explicitly named test database before importing Payload config.
if (!process.env.DATABASE_URL)
  throw new Error('Een lokale database is nodig voor de afzonderlijke toegangscontrole.')
const database = new URL(process.env.DATABASE_URL)
database.pathname = `/familieboom_toegang_test_${Date.now()}`
process.env.DATABASE_URL = database.toString()
process.env.PAYLOAD_SECRET = randomBytes(40).toString('hex')
process.env.PUBLIC_FAMILY_READ = 'true' // This obsolete setting must never grant access.
process.env.SMTP_HOST = 'smtp.example.invalid'
process.env.SMTP_USER = 'fictief'
process.env.SMTP_PASSWORD = 'uitsluitend-een-test'
process.env.MAIL_FROM = 'familie@example.invalid'
process.env.FAMILY_APP_URL = 'http://127.0.0.1:3002'
const { getPayload } = await import('payload'),
  { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const emails: { subject?: unknown; text?: unknown; to?: unknown }[] = []
payload.sendEmail = async (message) => {
  emails.push(message)
  return { accepted: [] }
}
let checks = 0
function check(value: unknown, message: string) {
  assert(value, message)
  checks++
}
async function rejects(action: () => Promise<unknown>, message: string) {
  await assert.rejects(action, message)
  checks++
}
const memberByEmail = async (email: string) =>
  (
    await payload.find({
      collection: 'family-members',
      where: { email: { equals: email } },
      overrideAccess: true,
      showHiddenFields: true,
      depth: 0,
    })
  ).docs[0]
async function clearLimits() {
  await payload.delete({
    collection: 'family-rate-limits',
    where: { id: { greater_than: 0 } },
    overrideAccess: true,
  })
}
async function allowNewCode(id: number) {
  await clearLimits()
  await payload.update({
    collection: 'family-members',
    id,
    data: { codeSentAt: '2000-01-01T00:00:00.000Z' },
    overrideAccess: true,
  })
}
const inviteToken = () =>
  new URLSearchParams(
    new URL(String(emails.at(-1)?.text).match(/https?:\/\/\S+/)![0]).hash.slice(1),
  ).get('uitnodiging')!
const codeFromEmail = () => String(emails.at(-1)?.text).match(/\b\d{6}\b/)![0]
async function issue(email: string) {
  const ticket = await requestCode(payload, email, 'fictieve-testclient')
  check(!!ticket.deliver, 'Een actief account ontvangt een code.')
  await ticket.deliver!()
  return codeFromEmail()
}
try {
  check(
    (await payload.count({ collection: 'people', overrideAccess: true })).totalDocs === 0,
    'Alle controles gebruiken een lege, afzonderlijke database.',
  )
  const password = randomBytes(24).toString('base64url')
  const admin = {
    ...(await payload.create({
      collection: 'administrators',
      data: { name: 'Fictieve beheerder', email: 'beheer@example.invalid', password },
      context: { bootstrapAdministrator: true },
      overrideAccess: true,
    })),
    collection: 'administrators' as const,
  }
  const person = await payload.create({
    collection: 'people',
    data: { name: 'Fictieve testpersoon', lifeStatus: 'unknown', isExample: true },
    overrideAccess: true,
  })
  await rejects(
    () => payload.find({ collection: 'people', overrideAccess: false }),
    'Een oude instelling voor openbaar lezen opent geen persoonsgegevens.',
  )
  await rejects(
    () => inviteMember(payload, null, 'Fictief lid', 'lid@example.invalid'),
    'Anonieme bezoekers kunnen niet uitnodigen.',
  )
  const host = process.env.SMTP_HOST
  delete process.env.SMTP_HOST
  await rejects(
    () => inviteMember(payload, admin, 'Niet aangemaakt', 'niet@example.invalid'),
    'Zonder e-maildienst wordt geen uitnodiging voorgespiegeld.',
  )
  process.env.SMTP_HOST = host
  check(
    !(await memberByEmail('niet@example.invalid')),
    'Mislukte configuratie maakt geen account aan.',
  )
  await inviteMember(payload, admin, 'Fictief familielid', ' Lid@Example.Invalid ')
  const token = inviteToken(),
    member = await memberByEmail('lid@example.invalid')
  check(
    !(await requestCode(payload, member.email, 'test')).deliver,
    'Een nog niet geaccepteerde uitnodiging geeft geen inlogcode.',
  )
  await payload.update({
    collection: 'family-members',
    id: member.id,
    data: { inviteExpiresAt: '2000-01-01T00:00:00.000Z' },
    overrideAccess: true,
  })
  await rejects(
    () => acceptInvitation(payload, token, 'test'),
    'Een verlopen uitnodiging kan geen account activeren.',
  )
  await payload.update({
    collection: 'family-members',
    id: member.id,
    data: { inviteExpiresAt: new Date(Date.now() + 86_400_000).toISOString() },
    overrideAccess: true,
  })
  check(
    member.email === normalizeEmail('Lid@Example.Invalid'),
    'E-mailadressen worden genormaliseerd.',
  )
  check(
    member.status === 'invited' && !!member.invitedAt,
    'Een verzonden uitnodiging is herkenbaar.',
  )
  check(
    !!member.inviteHash &&
      member.inviteHash !== token &&
      member.inviteHash === secretHash(payload.secret, 'invite', token),
    'Alleen de hash van de uitnodiging wordt opgeslagen.',
  )
  check(
    !(await payload.findByID({ collection: 'family-members', id: member.id, overrideAccess: true }))
      .inviteHash,
    'Zelfs gewone interne leesopdrachten geven geen uitnodigingshash terug.',
  )
  await rejects(
    () => acceptInvitation(payload, 'ongeldig', 'test'),
    'Ongeldige uitnodigingen worden geweigerd.',
  )
  const accepts = await Promise.allSettled([
    acceptInvitation(payload, token, 'test'),
    acceptInvitation(payload, token, 'test'),
  ])
  check(
    accepts.filter((r) => r.status === 'fulfilled').length === 1,
    'Gelijktijdig accepteren werkt maar één keer.',
  )
  check(
    (await memberByEmail(member.email)).status === 'active',
    'Accepteren activeert uitsluitend het uitgenodigde account.',
  )
  await rejects(
    () => acceptInvitation(payload, token, 'test'),
    'Een uitnodiging kan niet worden hergebruikt.',
  )
  const unknown = await requestCode(payload, 'onbekend@example.invalid', 'test')
  check(!unknown.deliver, 'Onbekende adressen krijgen geen mail en geen account.')
  check(
    !(await memberByEmail('onbekend@example.invalid')),
    'Een codeaanvraag is geen openbare registratie.',
  )
  const code = await issue(member.email)
  const stored = await memberByEmail(member.email)
  check(
    !!stored.codeHash && stored.codeHash !== code,
    'De inlogcode staat niet leesbaar in de database.',
  )
  check(
    !(await requestCode(payload, member.email, 'test')).deliver,
    'De afkoelperiode voorkomt herhaalde code-mails.',
  )
  await rejects(
    () => verifyCode(payload, member.email, code === '000000' ? '111111' : '000000', 'test'),
    'Een foute code wordt geweigerd.',
  )
  check(
    (await memberByEmail(member.email)).codeAttempts === 1,
    'Een mislukte poging blijft ook na een foutrespons opgeslagen.',
  )
  const results = await Promise.allSettled([
    verifyCode(payload, member.email, code, 'test'),
    verifyCode(payload, member.email, code, 'test'),
  ])
  const successes = results.filter(
    (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof verifyCode>>> =>
      r.status === 'fulfilled',
  )
  check(successes.length === 1, 'Ook gelijktijdige verificaties gebruiken een code maar één keer.')
  const session = successes[0].value
  check(
    (await memberByEmail(member.email)).codeHash === null,
    'Een gebruikte code wordt verwijderd.',
  )
  const sessionRow = (await payload.find({ collection: 'family-sessions', overrideAccess: true }))
    .docs[0]
  check(
    sessionRow.tokenHash !== session.token &&
      sessionRow.tokenHash === secretHash(payload.secret, 'session', session.token),
    'Sessies worden alleen als hash opgeslagen.',
  )
  const headers = new Headers({
    cookie: `${cookieName(payload.config.cookiePrefix)}=${session.token}`,
  })
  const { user } = await payload.auth({ headers })
  check(
    user?.collection === 'family-members',
    'De normale Payload-authenticatie herkent een familiesessie.',
  )
  if (user?.collection !== 'family-members') throw new Error('De familiesessie ontbreekt.')
  check(
    !('codeHash' in user) && !('inviteHash' in user),
    'De aangemelde gebruiker bevat geen codes of uitnodigingsgeheimen.',
  )
  for (const collection of ['people', 'parentages', 'partnerships'] as const) {
    await payload.find({ collection, user, overrideAccess: false })
    checks++
  }
  await rejects(
    () =>
      payload.update({
        collection: 'people',
        id: person.id,
        data: { name: 'Niet toegestaan' },
        user,
        overrideAccess: false,
      }),
    'Familieleden mogen personen niet wijzigen.',
  )
  await rejects(
    () =>
      payload.create({
        collection: 'people',
        data: { name: 'Niet toegestaan', lifeStatus: 'unknown' },
        user,
        overrideAccess: false,
      }),
    'Familieleden mogen geen personen toevoegen.',
  )
  await rejects(
    () => payload.delete({ collection: 'people', id: person.id, user, overrideAccess: false }),
    'Familieleden mogen geen personen verwijderen.',
  )
  for (const collection of [
    'family-members',
    'family-sessions',
    'family-rate-limits',
    'administrators',
  ] as const)
    await rejects(
      () => payload.find({ collection, user, overrideAccess: false }),
      'Familieleden kunnen geen accounts of inloggeheimen opvragen.',
    )
  await rejects(
    () => inviteMember(payload, user, 'Ongewenst', 'anders@example.invalid'),
    'Een familielid kan geen toegang uitdelen.',
  )
  await rejects(
    () => revokeMember(payload, user, member.id),
    'Een familielid kan geen toegang intrekken.',
  )
  await rejects(
    () =>
      payload.create({
        collection: 'family-members',
        data: {
          name: 'Ongewenst',
          email: 'anders@example.invalid',
          status: 'invited',
          authVersion: 1,
        },
        overrideAccess: false,
      }),
    'Directe accountregistratie is geblokkeerd.',
  )
  await rejects(
    () =>
      payload.login({
        collection: 'family-members',
        data: { email: member.email, password: 'willekeurig' },
      }),
    'Wachtwoord-inloggen kan de codecontrole niet omzeilen.',
  )
  const adminLogin = await payload.login({
    collection: 'administrators',
    data: { email: admin.email, password },
  })
  const both = new Headers({
    cookie: `${cookieName(payload.config.cookiePrefix)}=${session.token}; ${payload.config.cookiePrefix}-token=${adminLogin.token}`,
  })
  check(
    (await payload.auth({ headers: both })).user?.collection === 'administrators',
    'Een bestaande beheerderslogin houdt voorrang en behoudt zijn rechten.',
  )
  await allowNewCode(member.id)
  const bruteCode = await issue(member.email)
  for (let i = 0; i < 5; i++)
    await rejects(
      () => verifyCode(payload, member.email, '000000', 'test'),
      'Raadpogingen zijn begrensd.',
    )
  await rejects(
    () => verifyCode(payload, member.email, bruteCode, 'test'),
    'Na vijf foute pogingen is ook de juiste oude code ongeldig.',
  )
  await allowNewCode(member.id)
  const expiredCode = await issue(member.email)
  await payload.update({
    collection: 'family-members',
    id: member.id,
    data: { codeExpiresAt: '2000-01-01T00:00:00.000Z' },
    overrideAccess: true,
  })
  await rejects(
    () => verifyCode(payload, member.email, expiredCode, 'test'),
    'Een verlopen code wordt geweigerd.',
  )
  await allowNewCode(member.id)
  const pendingCode = await issue(member.email)
  await revokeMember(payload, admin, member.id)
  check(
    !(await payload.auth({ headers })).user,
    'Intrekken blokkeert een bestaande sessie direct bij de volgende aanvraag.',
  )
  await rejects(
    () => verifyCode(payload, member.email, pendingCode, 'test'),
    'Intrekken maakt ook een openstaande code ongeldig.',
  )
  check(
    (
      await payload.count({
        collection: 'family-sessions',
        where: { member: { equals: member.id } },
        overrideAccess: true,
      })
    ).totalDocs === 0,
    'Intrekken verwijdert alle sessies van dat familielid.',
  )
  await clearLimits()
  await inviteMember(payload, admin, member.name, member.email)
  const reinvite = inviteToken()
  await acceptInvitation(payload, reinvite, 'test')
  check(!(await payload.auth({ headers })).user, 'Opnieuw uitnodigen herstelt geen oude sessie.')
  await allowNewCode(member.id)
  const freshCode = await issue(member.email),
    freshSession = await verifyCode(payload, member.email, freshCode, 'test', true)
  check(
    new Date(freshSession.expiresAt).getTime() > Date.now() + 29 * 24 * 60 * 60_000,
    'Onthouden op een eigen apparaat geeft maximaal dertig dagen toegang.',
  )
  const freshRow = (
    await payload.find({
      collection: 'family-sessions',
      where: { tokenHash: { equals: secretHash(payload.secret, 'session', freshSession.token) } },
      overrideAccess: true,
    })
  ).docs[0]
  await payload.update({
    collection: 'family-sessions',
    id: freshRow.id,
    data: { expiresAt: '2000-01-01T00:00:00.000Z' },
    overrideAccess: true,
  })
  check(
    !(
      await payload.auth({
        headers: new Headers({
          cookie: `${cookieName(payload.config.cookiePrefix)}=${freshSession.token}`,
        }),
      })
    ).user,
    'Een verlopen sessie geeft ook met de juiste cookie geen toegang.',
  )
  await logoutSession(payload, freshSession.token)
  check(
    !(
      await payload.auth({
        headers: new Headers({
          cookie: `${cookieName(payload.config.cookiePrefix)}=${freshSession.token}`,
        }),
      })
    ).user,
    'Uitloggen maakt de server-sessie ongeldig.',
  )
  await rejects(
    () => listMembers(payload, user),
    'De toegangsbeheerpagina blijft alleen voor beheerders.',
  )
  const listing = await listMembers(payload, admin)
  check(
    !('codeHash' in listing[0]) && !('inviteHash' in listing[0]),
    'De beheerlijst bevat geen inloggeheimen.',
  )
  await allowNewCode(member.id)
  const failedMailTicket = await requestCode(payload, member.email, 'test')
  const originalSend = payload.sendEmail
  payload.sendEmail = async () => {
    throw new Error('Fictieve mailstoring')
  }
  await failedMailTicket.deliver!()
  payload.sendEmail = originalSend
  const failedMailMember = await memberByEmail(member.email)
  check(
    failedMailMember.mailFailed && !failedMailMember.codeHash,
    'Een mislukte mail laat geen bruikbare code achter en is herkenbaar voor de beheerder.',
  )
  await allowNewCode(member.id)
  for (let i = 0; i < 5; i++) {
    const ticket = await requestCode(payload, member.email, 'limiet-test')
    check(!!ticket.deliver, 'Maximaal vijf nieuwe codes per uur blijven beschikbaar.')
    if (i === 0)
      for (let j = 0; j < 6; j++)
        check(
          !(await requestCode(payload, member.email, 'limiet-test')).deliver,
          'Een vroege herkansing verstuurt geen extra mail.',
        )
    await payload.update({
      collection: 'family-members',
      id: member.id,
      data: { codeSentAt: '2000-01-01T00:00:00.000Z' },
      overrideAccess: true,
    })
  }
  check(
    !(await requestCode(payload, member.email, 'limiet-test')).deliver,
    'Meer dan vijf code-mails per uur wordt geblokkeerd, ook buiten de minuutlimiet.',
  )
  check(
    (await payload.findByID({ collection: 'people', id: person.id, overrideAccess: true })).name ===
      person.name,
    'Geen enkele toegangscontrole heeft persoonsgegevens gewijzigd.',
  )
  console.log(
    `${checks} toegangscontroles geslaagd in een afzonderlijke database met uitsluitend fictieve gegevens. Er zijn geen echte e-mails verstuurd.`,
  )
} finally {
  await payload.destroy()
}
process.exit(0)
