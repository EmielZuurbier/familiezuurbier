import { siteText, type SiteSettings } from '../site-settings'

const escapeHTML = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  )
const fonts: Record<string, string> = {
  lora: "Georgia, 'Times New Roman', serif",
  'dm-sans': 'Arial, Helvetica, sans-serif',
  system: 'Arial, Helvetica, sans-serif',
}

type EmailContent = {
  settings: SiteSettings
  origin: string
  title: string
  preheader: string
  content: string
  notice: string
}

/** Table layout and inline styles work without the application's CSS or web fonts. */
function emailLayout({ settings, origin, title, preheader, content, notice }: EmailContent) {
  const { ink, green, paper, surface, accent, muted, line, headingFont, bodyFont } =
    settings.appearance
  const name = escapeHTML(settings.identity.name)
  const home = escapeHTML(new URL('/', origin).href)
  const logo = escapeHTML(new URL(settings.logo || '/email/family-branch.png', origin).href)
  const logoAlt = settings.logo ? escapeHTML(siteText(settings.identity.logoAlt, settings)) : ''
  const logoStyle = settings.logo ? '' : `background-color:${ink};border-radius:10px;`
  const wordmark = escapeHTML(settings.identity.wordmark)
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHTML(title)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${paper};color:${ink};font-family:${fonts[bodyFont]};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHTML(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${paper}">
    <tr><td align="center" style="padding:36px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${surface}" style="max-width:600px;border:1px solid ${line};border-radius:16px;overflow:hidden;">
        <tr><td height="4" bgcolor="${accent}" style="height:4px;font-size:0;line-height:4px;">&nbsp;</td></tr>
        <tr><td style="padding:30px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="56" valign="middle" style="width:56px;vertical-align:middle;"><a href="${home}" style="text-decoration:none;"><img src="${logo}" width="44" height="44" alt="${logoAlt}" style="display:block;width:44px;height:44px;border:0;${logoStyle}"></a></td>
            <td valign="middle" style="vertical-align:middle;"><p style="margin:0 0 5px;font-size:22px;line-height:26px;font-weight:bold;letter-spacing:-0.7px;color:${ink};">${wordmark}${settings.identity.showDot ? `<span style="color:${accent};">.</span>` : ''}</p><p style="margin:0;color:${muted};font-size:10px;line-height:16px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">${name}</p></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 28px 30px;">
          <p style="margin:0 0 12px;color:${muted};font-size:10px;line-height:16px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;">Een plek voor de familie</p>
          <h1 style="margin:0 0 22px;color:${ink};font-family:${fonts[headingFont]};font-size:32px;line-height:40px;font-weight:normal;">${escapeHTML(title)}</h1>
          ${content}
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid ${line};"><p style="margin:0;color:${muted};font-size:12px;line-height:20px;">${escapeHTML(notice)}</p></td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;"><tr><td align="center" style="padding:22px 12px 0;">
        <p style="margin:0 0 8px;color:${muted};font-size:12px;line-height:20px;">${escapeHTML(siteText(settings.shared.privacyNote, settings))}</p>
        <a href="${home}" style="color:${green};font-size:12px;line-height:20px;text-decoration:underline;">${name}</a>
      </td></tr></table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`
}

export function invitationEmail({
  settings,
  origin,
  name,
  invitationURL,
}: {
  settings: SiteSettings
  origin: string
  name: string
  invitationURL: string
}) {
  const introduction = siteText(settings.mail.invitationIntroduction, settings)
  const { ink, green, surface, muted } = settings.appearance
  const url = escapeHTML(invitationURL)
  const notice = 'Verwachtte je deze uitnodiging niet? Dan kun je deze e-mail negeren.'
  return {
    subject: siteText(settings.mail.invitationSubject, settings),
    text: `Hoi ${name},\n\n${introduction}\n\nAccepteer de uitnodiging binnen zeven dagen:\n${invitationURL}\n\nDaarna log je in met een eenmalige code per e-mail. Je krijgt alleen kijkrechten.\n\n${notice}\n\n${settings.identity.name}`,
    html: emailLayout({
      settings,
      origin,
      title: 'Je bent uitgenodigd.',
      preheader: `Een persoonlijke uitnodiging voor ${settings.identity.name}. Zeven dagen geldig.`,
      notice,
      content: `<p style="margin:0 0 14px;color:${ink};font-size:16px;line-height:27px;">Hoi ${escapeHTML(name)},</p>
          <p style="margin:0 0 18px;color:${ink};font-size:15px;line-height:26px;white-space:pre-line;">${escapeHTML(introduction).replace(/\r?\n/g, '<br>')}</p>
          <p style="margin:0 0 24px;color:${muted};font-size:14px;line-height:24px;">Je krijgt alleen kijkrechten in de besloten familieomgeving. Alleen beheerders kunnen gegevens wijzigen.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${green}" style="background-color:${green};border:1px solid ${green};border-radius:8px;text-align:center;mso-padding-alt:14px 20px;"><a href="${url}" style="display:inline-block;padding:14px 20px;color:${surface};font-size:15px;line-height:22px;font-weight:bold;text-decoration:none;border-radius:8px;">Accepteer de uitnodiging</a></td></tr></table>
          <p style="margin:22px 0 0;color:${muted};font-size:13px;line-height:23px;">Deze persoonlijke uitnodiging is <strong>zeven dagen geldig</strong>. Daarna log je in met een eenmalige code per e-mail. Je hoeft geen wachtwoord te onthouden.</p>
          <p style="margin:22px 0 6px;color:${muted};font-size:12px;line-height:20px;">Werkt de knop niet? Kopieer deze link naar je browser:</p>
          <p style="margin:0;font-size:12px;line-height:20px;word-break:break-all;overflow-wrap:anywhere;"><a href="${url}" style="color:${green};text-decoration:underline;word-break:break-all;">${url}</a></p>`,
    }),
  }
}

export function loginCodeEmail({
  settings,
  origin,
  code,
}: {
  settings: SiteSettings
  origin: string
  code: string
}) {
  const { ink, green, paper, line, muted } = settings.appearance
  const notice = 'Heb je geen code aangevraagd? Dan kun je deze e-mail negeren.'
  return {
    subject: siteText(settings.mail.codeSubject, settings),
    text: `Je eenmalige inlogcode is: ${code}\n\nDeze code is tien minuten geldig en kan één keer worden gebruikt. Deel de code niet.\n\n${notice}\n\n${settings.identity.name}`,
    html: emailLayout({
      settings,
      origin,
      title: 'Je inlogcode.',
      preheader: `Je eenmalige inlogcode voor ${settings.identity.name}. Tien minuten geldig.`,
      notice,
      content: `<p style="margin:0 0 24px;color:${ink};font-size:15px;line-height:26px;">Vul deze code in op het inlogscherm om verder te gaan naar de besloten familieomgeving.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${paper}" style="padding:24px 12px;background-color:${paper};border:1px solid ${line};border-radius:10px;">
            <p style="margin:0 0 10px;color:${muted};font-size:10px;line-height:16px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">Je inlogcode</p>
            <p style="margin:0;color:${green};font-family:Consolas,'Courier New',monospace;font-size:34px;line-height:44px;font-weight:bold;letter-spacing:6px;">${escapeHTML(code)}</p>
          </td></tr></table>
          <p style="margin:22px 0 0;color:${muted};font-size:14px;line-height:24px;">Deze code is <strong>tien minuten geldig</strong> en kan één keer worden gebruikt. Deel de code niet.</p>`,
    }),
  }
}
