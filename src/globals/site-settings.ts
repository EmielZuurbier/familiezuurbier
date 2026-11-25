import {
  APIError,
  type Field,
  type TextField,
  type TextareaField,
  type GlobalConfig,
} from 'payload'
import { administrator } from '../collections/access'
import { relationLock } from '../collections/collections'
import {
  defaultSiteSettings as defaults,
  gtmContainer,
  hexColor,
  moduleKeys,
} from '../lib/site-settings'

const text = (
  name: string,
  label: string,
  value: string,
  multiline = false,
): TextField | TextareaField => {
  const shared = { name, label, defaultValue: value, maxLength: multiline ? 1500 : 180 }
  return multiline ? { ...shared, type: 'textarea' } : { ...shared, type: 'text' }
}
const checkbox = (name: string, label: string, value: boolean): Field => ({
  name,
  label,
  type: 'checkbox',
  defaultValue: value,
})
const pageLabels = {
  tree: 'Stamboom',
  map: 'Kaart',
  calendar: 'Verjaardagen',
  events: 'Gebeurtenissen',
}
const pageFields = (key: (typeof moduleKeys)[number]): Field[] => {
  const page = defaults.pages[key]
  return [
    checkbox('enabled', 'Deze module tonen op de website', page.enabled),
    {
      type: 'row',
      fields: [
        text('label', 'Naam in het menu', page.label),
        text('shortLabel', 'Korte menunaam (smalle schermen)', page.shortLabel),
      ],
    },
    {
      type: 'row',
      fields: [
        text('workspaceTitle', 'Titel boven het overzicht', page.workspaceTitle),
        text('pageTitle', 'Titel in het browsertabblad', page.pageTitle),
      ],
    },
    text('eyebrow', 'Boventitel in de zijbalk', page.eyebrow),
    {
      type: 'row',
      fields: [
        text('title', 'Hoofdtitel – eerste regel', page.title),
        text('titleAccent', 'Hoofdtitel – tweede regel', page.titleAccent),
      ],
    },
    text('description', 'Introductie in de zijbalk', page.description, true),
    {
      type: 'collapsible',
      label: 'Teksten voor de fictieve voorbeeldweergave',
      admin: { initCollapsed: true },
      fields: [
        text('exampleTitle', 'Voorbeeldtitel – eerste regel', page.exampleTitle),
        text('exampleTitleAccent', 'Voorbeeldtitel – tweede regel', page.exampleTitleAccent),
      ],
    },
  ]
}

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Website-instellingen',
  admin: {
    group: 'Website',
    description:
      'Naam, huisstijl, teksten en modules voor de hele website. Gebruik {familienaam} en {websitenaam} om namen automatisch te laten meelopen. Ververs open pagina’s na het opslaan. Deze instellingen en huisstijlbestanden zijn openbaar; zet hier geen privégegevens in.',
  },
  access: { read: () => true, update: administrator },
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        await relationLock(req)
        const active = moduleKeys.some(
          (key) =>
            data?.pages?.[key]?.enabled ??
            originalDoc?.pages?.[key]?.enabled ??
            defaults.pages[key].enabled,
        )
        if (!active)
          throw new APIError(
            'Laat ten minste één module aan staan, zodat de website een startpagina heeft.',
            400,
          )
        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Naam & logo',
          fields: [
            {
              name: 'identity',
              label: 'Identiteit',
              type: 'group',
              fields: [
                { ...text('name', 'Websitenaam', defaults.identity.name), required: true },
                { ...text('surname', 'Familienaam', defaults.identity.surname), required: true },
                text('wordmark', 'Woordmerk naast het logo', defaults.identity.wordmark),
                checkbox(
                  'showDot',
                  'Accentpunt achter het woordmerk tonen',
                  defaults.identity.showDot,
                ),
                text('description', 'Websitebeschrijving', defaults.identity.description, true),
                {
                  name: 'logo',
                  label: 'Logo',
                  type: 'upload',
                  relationTo: 'brand-assets',
                  admin: {
                    description:
                      'Optioneel. Vervangt het stamboomicoon. Zonder bestand blijft het huidige icoon zichtbaar.',
                  },
                },
                text(
                  'logoAlt',
                  'Toegankelijke beschrijving van het logo',
                  defaults.identity.logoAlt,
                ),
                {
                  name: 'icon',
                  label: 'Browsericoon (favicon)',
                  type: 'upload',
                  relationTo: 'brand-assets',
                  admin: {
                    description:
                      'Bij voorkeur een vierkante PNG. Zonder bestand blijft het huidige browsericoon behouden.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Huisstijl',
          fields: [
            {
              name: 'appearance',
              label: 'Kleuren & letters',
              type: 'group',
              fields: [
                ...Object.entries({
                  ink: 'Tekst en donkere vlakken',
                  green: 'Primaire kleur',
                  paper: 'Pagina-achtergrond',
                  surface: 'Zijbalken en kaarten',
                  accent: 'Accentkleur',
                  muted: 'Secundaire tekst',
                  line: 'Randen en scheidingslijnen',
                }).map(([name, label]): Field => ({
                  name,
                  label,
                  type: 'text',
                  required: true,
                  defaultValue: defaults.appearance[name as keyof typeof defaults.appearance],
                  validate: (value: unknown) =>
                    (typeof value === 'string' && hexColor.test(value)) ||
                    'Gebruik een kleurcode met zes tekens, bijvoorbeeld #345d49.',
                  admin: {
                    components: { Field: './components/admin/ColorField#ColorField' },
                    description:
                      'Kleurcode, inclusief #. Controleer bij een nieuwe kleur of de tekst goed leesbaar blijft.',
                  },
                })),
                ...(['headingFont', 'bodyFont'] as const).map((name): Field => ({
                  name,
                  label:
                    name === 'headingFont'
                      ? 'Lettertype voor titels'
                      : 'Lettertype voor lopende tekst',
                  type: 'select',
                  required: true,
                  defaultValue: defaults.appearance[name],
                  options: [
                    { label: 'Lora (huidige titels)', value: 'lora' },
                    { label: 'DM Sans (huidige tekst)', value: 'dm-sans' },
                    { label: 'Systeemlettertype', value: 'system' },
                  ],
                })),
              ],
            },
          ],
        },
        {
          label: 'Pagina’s & modules',
          fields: [
            {
              name: 'pages',
              label: 'Weergaven',
              type: 'group',
              fields: [
                {
                  type: 'tabs',
                  tabs: moduleKeys.map((key) => ({
                    label: pageLabels[key],
                    fields: [
                      { name: key, label: false, type: 'group' as const, fields: pageFields(key) },
                    ],
                  })),
                },
              ],
            },
            {
              name: 'shared',
              label: 'Gedeelde titels',
              type: 'group',
              fields: [
                text(
                  'workspaceEyebrow',
                  'Boventitel boven de weergaven',
                  defaults.shared.workspaceEyebrow,
                ),
                text(
                  'statisticsTitle',
                  'Titel van de stamboomcijfers',
                  defaults.shared.statisticsTitle,
                ),
                text('personTitle', 'Titel van de persoonsgegevens', defaults.shared.personTitle),
                text('eventEyebrow', 'Boventitel bij een verhaal', defaults.shared.eventEyebrow),
                text(
                  'sidebarNote',
                  'Korte tekst onderaan de stamboom',
                  defaults.shared.sidebarNote,
                  true,
                ),
                text(
                  'privacyNote',
                  'Bewaartekst onderaan de stamboom',
                  defaults.shared.privacyNote,
                ),
                text('manageLabel', 'Knop naar het beheer', defaults.shared.manageLabel),
              ],
            },
          ],
        },
        {
          label: 'Inloggen',
          fields: [
            {
              name: 'login',
              label: 'Inlogscherm & afgeschermde pagina',
              type: 'group',
              fields: [
                ...Object.entries({
                  pageTitle: 'Titel in het browsertabblad',
                  eyebrow: 'Boventitel',
                  title: 'Welkomsttitel',
                  description: 'Uitleg bij het inloggen',
                  inviteTitle: 'Titel bij een uitnodiging',
                  inviteDescription: 'Uitleg bij een uitnodiging',
                  codeTitle: 'Titel bij de inlogcode',
                  codeDescription: 'Uitleg bij de inlogcode (gebruik {email})',
                  privacy: 'Privacytekst onderaan',
                  privateTitle: 'Titel voor bezoekers zonder toegang',
                  privateDescription: 'Uitleg voor bezoekers zonder toegang',
                  button: 'Knop om een code aan te vragen',
                }).map(([name, label]) =>
                  text(
                    name,
                    label,
                    defaults.login[name as keyof typeof defaults.login],
                    name.toLowerCase().includes('description'),
                  ),
                ),
              ],
            },
            {
              name: 'mail',
              label: 'E-mailteksten',
              type: 'group',
              admin: {
                description:
                  'De afzendernaam volgt de websitenaam. De technische mailinstellingen blijven bij de serverinstellingen. De inlogcode, geldigheidsduur en uitnodigingslink worden automatisch toegevoegd.',
              },
              fields: [
                text('invitationSubject', 'Onderwerp uitnodiging', defaults.mail.invitationSubject),
                text(
                  'invitationIntroduction',
                  'Introductie uitnodiging',
                  defaults.mail.invitationIntroduction,
                  true,
                ),
                text('codeSubject', 'Onderwerp inlogcode', defaults.mail.codeSubject),
              ],
            },
          ],
        },
        {
          label: 'Instellingen',
          fields: [
            {
              name: 'options',
              label: 'Bediening & functies',
              type: 'group',
              admin: {
                description:
                  'Begininstellingen gelden voor nieuwe bezoeken. Een persoonlijk gekozen stamboomindeling blijft behouden.',
              },
              fields: [
                {
                  name: 'defaultTreeStyle',
                  label: 'Standaard stamboomindeling',
                  type: 'select',
                  required: true,
                  defaultValue: defaults.options.defaultTreeStyle,
                  options: [
                    { label: 'Gestructureerd', value: 'structured' },
                    { label: 'Vrije boomvorm', value: 'organic' },
                  ],
                },
                checkbox(
                  'mouseExploration',
                  'Subtiele muisbeweging standaard aan',
                  defaults.options.mouseExploration,
                ),
                {
                  name: 'mouseSpeed',
                  label: 'Sterkte van de subtiele muisbeweging',
                  type: 'select',
                  required: true,
                  defaultValue: defaults.options.mouseSpeed,
                  options: [
                    { label: 'Zeer subtiel', value: 'slow' },
                    { label: 'Subtiel', value: 'normal' },
                    { label: 'Meer beweging', value: 'fast' },
                  ],
                },
                checkbox('minimap', 'Minimap in de stamboom tonen', defaults.options.minimap),
                checkbox(
                  'statistics',
                  'Stamboomcijfers in de zijbalk tonen',
                  defaults.options.statistics,
                ),
                checkbox(
                  'calendarExport',
                  'Verjaardagen downloaden als .ics toestaan',
                  defaults.options.calendarExport,
                ),
                checkbox(
                  'mapResidence',
                  'Kaartlaag Huidige woonplaats standaard aan',
                  defaults.options.mapResidence,
                ),
                checkbox(
                  'mapBirth',
                  'Kaartlaag Geboorteplaats standaard aan',
                  defaults.options.mapBirth,
                ),
              ],
            },
            {
              name: 'tracking',
              label: 'Metingen',
              type: 'group',
              admin: {
                description:
                  'Wordt alleen geladen na de toegangscontrole van een familiepagina. Verstuur geen namen, geboortedata of andere familiegegevens naar je meetdienst.',
              },
              fields: [
                checkbox('enabled', 'Google Tag Manager inschakelen', defaults.tracking.enabled),
                {
                  name: 'containerId',
                  label: 'GTM-container-ID',
                  type: 'text',
                  defaultValue: defaults.tracking.containerId,
                  validate: (value: unknown) =>
                    !value ||
                    (typeof value === 'string' && gtmContainer.test(value)) ||
                    'Gebruik een geldig container-ID, bijvoorbeeld GTM-ABC123.',
                },
              ],
            },
          ],
        },
        {
          label: 'Beheer',
          fields: [
            {
              name: 'admin',
              label: 'Teksten in het CMS',
              type: 'group',
              fields: [
                ...Object.entries({
                  title: 'Welkomsttitel op het dashboard',
                  introduction: 'Introductie op het dashboard',
                  loginTitle: 'Titel op het CMS-inlogscherm',
                  loginDescription: 'Introductie op het CMS-inlogscherm',
                  accessPageTitle: 'Browsertitel van het toegangsbeheer',
                  accessTitle: 'Titel van het toegangsbeheer',
                  accessEyebrow: 'Boventitel van het toegangsbeheer',
                  accessDescription: 'Introductie van het toegangsbeheer',
                }).map(([name, label]) =>
                  text(
                    name,
                    label,
                    defaults.admin[name as keyof typeof defaults.admin],
                    name !== 'title' && name !== 'accessPageTitle',
                  ),
                ),
              ],
            },
          ],
        },
      ],
    },
  ],
}
