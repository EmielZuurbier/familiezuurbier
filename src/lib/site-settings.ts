/** Public website configuration only. Account, mail and database secrets stay in the environment. */
export const moduleKeys = ['tree', 'map', 'calendar', 'events'] as const
export type SiteModule = (typeof moduleKeys)[number]

export const defaultSiteSettings = {
  identity: {
    name: 'Familie Zuurbier',
    surname: 'Zuurbier',
    wordmark: 'familieboom',
    showDot: true,
    description: 'Een besloten plek om de stamboom van de familie {familienaam} te ontdekken.',
    logoAlt: '{websitenaam}',
  },
  appearance: {
    ink: '#233e33',
    green: '#345d49',
    paper: '#f8f9f4',
    surface: '#fffefa',
    accent: '#b49c71',
    muted: '#6f7c70',
    line: '#e2e7dd',
    headingFont: 'lora',
    bodyFont: 'dm-sans',
  },
  shared: {
    workspaceEyebrow: 'FAMILIEOVERZICHT',
    statisticsTitle: 'DE STAMBOOM IN CIJFERS',
    personTitle: 'PERSOONSGEGEVENS',
    eventEyebrow: 'EEN VERHAAL UIT ONZE FAMILIE',
    sidebarNote: 'Elke naam is een deel\nvan een groter verhaal.',
    privacyNote: 'Zorgvuldig bewaard, in eigen beheer',
    manageLabel: 'Stamboom beheren',
  },
  pages: {
    tree: {
      enabled: true,
      label: 'Stamboom',
      shortLabel: 'Stamboom',
      workspaceTitle: 'De stamboom',
      pageTitle: 'Onze stamboom',
      eyebrow: 'VAN GENERATIE OP GENERATIE',
      title: 'Familie',
      titleAccent: '{familienaam}.',
      description: 'Ontdek de mensen en de verbindingen die ons verhaal vormen.',
      exampleTitle: 'Onze familie,',
      exampleTitleAccent: 'verbonden.',
    },
    map: {
      enabled: true,
      label: 'Kaart',
      shortLabel: 'Kaart',
      workspaceTitle: 'Op de kaart',
      pageTitle: 'Familie op de kaart',
      eyebrow: 'VERBONDEN, WAAR WE OOK ZIJN',
      title: 'Familie',
      titleAccent: '{familienaam}.',
      description: 'Ontdek waar de familie woont en waar onze verhalen begonnen.',
      exampleTitle: 'Onze familie,',
      exampleTitleAccent: 'op de kaart.',
    },
    calendar: {
      enabled: true,
      label: 'Verjaardagskalender',
      shortLabel: 'Verjaardagen',
      workspaceTitle: 'Verjaardagen',
      pageTitle: 'Verjaardagskalender',
      eyebrow: 'ELKE VERJAARDAG EEN VERHAAL',
      title: 'Familie',
      titleAccent: '{familienaam}.',
      description: 'Alle geboortedagen bij elkaar. Kijk wie er jarig is en hoe oud iemand wordt.',
      exampleTitle: 'Een jaar vol',
      exampleTitleAccent: 'familie.',
    },
    events: {
      enabled: true,
      label: 'Gebeurtenissen',
      shortLabel: 'Verhalen',
      workspaceTitle: 'Gebeurtenissen',
      pageTitle: 'Gebeurtenissen',
      eyebrow: 'VERHALEN DIE ONS VERBINDEN',
      title: 'Familie',
      titleAccent: '{familienaam}.',
      description: 'Grote momenten en kleine verhalen. Bewaard voor de volgende generatie.',
      exampleTitle: 'Onze gedeelde',
      exampleTitleAccent: 'herinneringen.',
    },
  },
  login: {
    pageTitle: 'Inloggen',
    eyebrow: 'EEN PLEK VOOR DE FAMILIE',
    title: 'Welkom bij de familie {familienaam}.',
    description:
      'Log in met het e-mailadres waarop je bent uitgenodigd. Je ontvangt een eenmalige code; een wachtwoord is niet nodig.',
    inviteTitle: 'Je bent uitgenodigd.',
    inviteDescription:
      'Accepteer je persoonlijke uitnodiging om de stamboom en familiekaart te bekijken. Je krijgt alleen kijkrechten.',
    codeTitle: 'Bekijk je e-mail.',
    codeDescription:
      'Als {email} toegang heeft, ontvang je daar een zescijferige code. De code is tien minuten geldig.',
    privacy: 'Alleen uitgenodigde familieleden hebben toegang.',
    privateTitle: 'De familie {familienaam} blijft privé',
    privateDescription:
      'Deze gegevens zijn alleen voor uitgenodigde familieleden. Log in met je e-mailadres om de stamboom en kaart te bekijken.',
    button: 'Stuur mij een inlogcode',
  },
  options: {
    defaultTreeStyle: 'structured',
    mouseExploration: true,
    mouseSpeed: 'normal',
    minimap: true,
    statistics: true,
    calendarExport: true,
    mapResidence: true,
    mapBirth: true,
  },
  admin: {
    title: 'Welkom bij de familie {familienaam}',
    introduction: 'Beheer hier de mensen, familiebanden en verhalen die jullie verbinden.',
    loginTitle: 'Een plek voor jullie familieverhaal.',
    loginDescription:
      'Log in om personen, familiebanden, verhalen en de website-instellingen te beheren.',
    accessPageTitle: 'Familietoegang beheren',
    accessTitle: 'Familietoegang',
    accessEyebrow: 'PRIVÉ, VOOR DE FAMILIE',
    accessDescription:
      'Nodig familieleden persoonlijk uit. Zij kunnen de stamboom en kaart bekijken; alleen beheerders mogen gegevens wijzigen.',
  },
  mail: {
    invitationSubject: 'Je bent uitgenodigd voor de stamboom van de familie {familienaam}',
    invitationIntroduction:
      'Je bent uitgenodigd om de besloten stamboom en familiekaart van de familie {familienaam} te bekijken.',
    codeSubject: 'Je inlogcode voor de familie {familienaam}',
  },
  tracking: { enabled: true, containerId: 'GTM-T37ZTN97' },
}

export type SiteSettings = typeof defaultSiteSettings & { logo: string | null; icon: string | null }
export const hexColor = /^#[0-9a-f]{6}$/i
export const gtmContainer = /^GTM-[A-Z0-9]+$/
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

function mergeDefaults(defaults: Record<string, unknown>, input: unknown): Record<string, unknown> {
  const source = object(input)
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const value = source[key]
      if (typeof fallback === 'object') return [key, mergeDefaults(object(fallback), value)]
      return [key, typeof value === typeof fallback ? value : fallback]
    }),
  )
}

function assetURL(value: unknown) {
  const filename = object(value).filename
  return typeof filename === 'string' && filename && !/[\\/\x00-\x1f]/.test(filename)
    ? `/api/brand-assets/file/${encodeURIComponent(filename)}`
    : null
}

export function resolveSiteSettings(input?: unknown): SiteSettings {
  const settings = mergeDefaults(defaultSiteSettings, input) as typeof defaultSiteSettings
  for (const key of ['ink', 'green', 'paper', 'surface', 'accent', 'muted', 'line'] as const)
    if (!hexColor.test(settings.appearance[key]))
      settings.appearance[key] = defaultSiteSettings.appearance[key]
  if (!['lora', 'dm-sans', 'system'].includes(settings.appearance.headingFont))
    settings.appearance.headingFont = 'lora'
  if (!['lora', 'dm-sans', 'system'].includes(settings.appearance.bodyFont))
    settings.appearance.bodyFont = 'dm-sans'
  if (!['structured', 'organic'].includes(settings.options.defaultTreeStyle))
    settings.options.defaultTreeStyle = 'structured'
  if (!['slow', 'normal', 'fast'].includes(settings.options.mouseSpeed))
    settings.options.mouseSpeed = 'normal'
  if (!gtmContainer.test(settings.tracking.containerId)) settings.tracking.containerId = ''
  if (!moduleKeys.some((key) => settings.pages[key].enabled)) settings.pages.tree.enabled = true
  const identity = object(object(input).identity)
  return { ...settings, logo: assetURL(identity.logo), icon: assetURL(identity.icon) }
}

/** Replace known tokens once; inserted values are never interpreted as templates or HTML. */
export function siteText(
  text: string,
  settings: SiteSettings,
  values: Record<string, string> = {},
) {
  const tokens = {
    familienaam: settings.identity.surname,
    websitenaam: settings.identity.name,
    ...values,
  }
  return text.replace(
    /\{(familienaam|websitenaam|email)\}/g,
    (token, name: keyof typeof tokens) => tokens[name] ?? token,
  )
}

export function siteVariables(settings: SiteSettings): Record<string, string> {
  const fonts: Record<string, string> = {
    lora: "'Lora Variable', Georgia, serif",
    'dm-sans': "'DM Sans Variable', Arial, sans-serif",
    system: 'system-ui, sans-serif',
  }
  return {
    ...Object.fromEntries(
      Object.entries(settings.appearance)
        .filter(([key]) => !key.endsWith('Font'))
        .map(([key, value]) => [`--${key}`, value]),
    ),
    '--serif': fonts[settings.appearance.headingFont],
    '--sans': fonts[settings.appearance.bodyFont],
  }
}

export const modulePath: Record<SiteModule, string> = {
  tree: '/',
  map: '/kaart',
  calendar: '/verjaardagen',
  events: '/gebeurtenissen',
}
export function firstModulePath(settings: SiteSettings, base = '') {
  const key = moduleKeys.find((key) => settings.pages[key].enabled) ?? 'tree'
  return `${base}${modulePath[key] === '/' && base ? '' : modulePath[key]}`
}
