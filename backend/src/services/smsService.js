export async function sendSms({ to, message }) {
  if (!to || !message) return { ok: false, error: 'Missing fields' }
  // Placeholder: integrate provider (e.g., Twilio)
  // eslint-disable-next-line no-console
  console.log('[sms] ->', { to, message })
  return { ok: true }
}

export default { sendSms }


