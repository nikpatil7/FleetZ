import env from '../config/env.js'

export async function sendEmail({ to, subject, text }) {
  if (!to || !subject) return { ok: false, error: 'Missing fields' }
  // Placeholder: integrate provider (e.g., SendGrid/SES)
  // eslint-disable-next-line no-console
  console.log('[email] ->', { to, subject, text, from: env.fromEmail || 'noreply@example.com' })
  return { ok: true }
}

export default { sendEmail }


