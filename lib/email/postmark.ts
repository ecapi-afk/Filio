// lib/email/postmark.ts
// Postmark is the single email provider for Filio (send + inbound receive)

import { ServerClient } from 'postmark'

function getClient() {
  if (!process.env.POSTMARK_API_KEY) {
    throw new Error('POSTMARK_API_KEY is not configured')
  }
  return new ServerClient(process.env.POSTMARK_API_KEY)
}

const FROM = process.env.POSTMARK_FROM_EMAIL || 'Filio <noreply@filio.uk>'

// ---------------------------------------------------------------------------
// Magic Link
// ---------------------------------------------------------------------------

interface MagicLinkEmailVars {
  to: string
  clientName: string
  firmName: string
  uploadLink: string
}

export async function sendMagicLinkEmail(vars: MagicLinkEmailVars) {
  const client = getClient()
  const firstName = vars.clientName.split(' ')[0]

  const result = await client.sendEmail({
    From: FROM,
    To: vars.to,
    Subject: `Your secure upload link from ${vars.firmName}`,
    HtmlBody: `
      <p>Hi ${firstName},</p>
      <p>Your accountant <strong>${vars.firmName}</strong> has requested documents from you.</p>
      <p>
        <a href="${vars.uploadLink}" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">
          Upload your files securely
        </a>
      </p>
      <p>This link expires in 30 days.</p>
      <p>— The ${vars.firmName} team via Filio</p>
    `,
    TextBody: `Hi ${firstName},\n\nYour accountant ${vars.firmName} has requested documents from you.\n\nUpload here: ${vars.uploadLink}\n\nThis link expires in 30 days.\n\n— The ${vars.firmName} team via Filio`,
    MessageStream: 'outbound',
  })

  if (result.ErrorCode !== 0) {
    throw new Error(`Postmark error ${result.ErrorCode}: ${result.Message}`)
  }
}

// ---------------------------------------------------------------------------
// Reminder
// ---------------------------------------------------------------------------

interface ReminderEmailVars {
  to: string
  clientName: string
  firmName: string
  deadlineType: string
  deadlineDate: string
  uploadLink: string
}

export async function sendReminderEmail(vars: ReminderEmailVars) {
  const client = getClient()
  const firstName = vars.clientName.split(' ')[0]

  const result = await client.sendEmail({
    From: FROM,
    To: vars.to,
    Subject: `Action Required: ${vars.deadlineType} due ${vars.deadlineDate}`,
    HtmlBody: `
      <p>Hi ${firstName},</p>
      <p>This is a reminder that your <strong>${vars.deadlineType}</strong> is due on <strong>${vars.deadlineDate}</strong>.</p>
      <p>Please upload your required documents as soon as possible.</p>
      <p>
        <a href="${vars.uploadLink}" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">
          Upload your documents
        </a>
      </p>
      <p>— ${vars.firmName} via Filio</p>
    `,
    TextBody: `Hi ${firstName},\n\nThis is a reminder that your ${vars.deadlineType} is due on ${vars.deadlineDate}.\n\nPlease upload your required documents: ${vars.uploadLink}\n\n— ${vars.firmName} via Filio`,
    MessageStream: 'outbound',
  })

  if (result.ErrorCode !== 0) {
    throw new Error(`Postmark error ${result.ErrorCode}: ${result.Message}`)
  }
}

// ---------------------------------------------------------------------------
// Template-based helpers (optional – requires Postmark template IDs in env)
// ---------------------------------------------------------------------------

interface MagicLinkTemplateParams {
  to: string
  clientName: string
  magicLink: string
  firmName: string
}

export async function sendMagicLinkTemplate(params: MagicLinkTemplateParams): Promise<void> {
  const client = getClient()
  await client.sendEmailWithTemplate({
    From: FROM,
    To: params.to,
    TemplateId: parseInt(process.env.POSTMARK_MAGIC_LINK_TEMPLATE_ID || '0'),
    TemplateModel: {
      client_name: params.clientName,
      magic_link: params.magicLink,
      firm_name: params.firmName,
    },
  })
}

interface ReminderTemplateParams {
  to: string
  clientName: string
  deadline: string
  uploadLink: string
  firmName: string
}

export async function sendReminderTemplate(params: ReminderTemplateParams): Promise<void> {
  const client = getClient()
  await client.sendEmailWithTemplate({
    From: FROM,
    To: params.to,
    TemplateId: parseInt(process.env.POSTMARK_REMINDER_TEMPLATE_ID || '0'),
    TemplateModel: {
      client_name: params.clientName,
      deadline: params.deadline,
      upload_link: params.uploadLink,
      firm_name: params.firmName,
    },
  })
}

interface PasswordResetTemplateParams {
  to: string
  resetLink: string
}

export async function sendPasswordResetTemplate(params: PasswordResetTemplateParams): Promise<void> {
  const client = getClient()
  await client.sendEmailWithTemplate({
    From: FROM,
    To: params.to,
    TemplateId: parseInt(process.env.POSTMARK_PASSWORD_RESET_TEMPLATE_ID || '0'),
    TemplateModel: {
      reset_link: params.resetLink,
    },
  })
}

// ---------------------------------------------------------------------------
// Upload Failed Notification
// ---------------------------------------------------------------------------

interface UploadFailedEmailVars {
  to: string
  clientName: string
  firmName: string
  filename: string
  uploadLink: string
}

export async function sendUploadFailedEmail(vars: UploadFailedEmailVars) {
  const client = getClient()
  const firstName = vars.clientName.split(' ')[0]

  const result = await client.sendEmail({
    From: FROM,
    To: vars.to,
    Subject: `Action required: a file couldn't be saved — ${vars.firmName}`,
    HtmlBody: `
      <p>Hi ${firstName},</p>
      <p>We're sorry, but the following file you uploaded could not be saved to <strong>${vars.firmName}</strong>'s system:</p>
      <p style="padding:12px 16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;font-weight:600;">${vars.filename}</p>
      <p>Please try uploading it again using your secure link below:</p>
      <p>
        <a href="${vars.uploadLink}" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">
          Upload again
        </a>
      </p>
      <p>If you continue to have trouble, please contact <strong>${vars.firmName}</strong> directly.</p>
      <p>— The ${vars.firmName} team via Filio</p>
    `,
    TextBody: `Hi ${firstName},\n\nThe following file you uploaded could not be saved to ${vars.firmName}'s system:\n\n  ${vars.filename}\n\nPlease try uploading it again: ${vars.uploadLink}\n\nIf you continue to have trouble, please contact ${vars.firmName} directly.\n\n— The ${vars.firmName} team via Filio`,
    MessageStream: 'outbound',
  })

  if (result.ErrorCode !== 0) {
    throw new Error(`Postmark error ${result.ErrorCode}: ${result.Message}`)
  }
}

// ---------------------------------------------------------------------------
// OTP (Portal Security Verification)
// ---------------------------------------------------------------------------

interface OTPEmailVars {
  to: string
  clientName: string
  firmName: string
  otpCode: string
}

export async function sendOTPEmail(vars: OTPEmailVars) {
  const client = getClient()
  const firstName = vars.clientName.split(' ')[0]

  const result = await client.sendEmail({
    From: FROM,
    To: vars.to,
    Subject: `Your verification code — ${vars.otpCode}`,
    HtmlBody: `
      <p>Hi ${firstName},</p>
      <p>Your security verification code for <strong>${vars.firmName}</strong>'s client portal is:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f9fafb;border-radius:8px;">${vars.otpCode}</p>
      <p>This code expires in <strong>10 minutes</strong> and can only be used once.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>— The ${vars.firmName} team via Filio</p>
    `,
    TextBody: `Hi ${firstName},\n\nYour verification code is: ${vars.otpCode}\n\nThis code expires in 10 minutes.\n\n— The ${vars.firmName} team via Filio`,
    MessageStream: 'outbound',
  })

  if (result.ErrorCode !== 0) {
    throw new Error(`Postmark error ${result.ErrorCode}: ${result.Message}`)
  }
}

// ---------------------------------------------------------------------------
// Upload Result Summary (multiple files — Magic Email path)
// Only sent when at least one file fails. Lists succeeded and failed files.
// ---------------------------------------------------------------------------

interface UploadResultEmailVars {
  to: string
  clientName: string
  firmName: string
  succeeded: string[]
  failed: Array<{ filename: string; reason?: string }>
  uploadLink: string
}

export async function sendUploadResultEmail(vars: UploadResultEmailVars) {
  const client = getClient()
  const firstName = vars.clientName.split(' ')[0]

  const succeededHtml = vars.succeeded.length > 0
    ? `<p>The following files were saved successfully:</p><ul>${vars.succeeded.map(f => `<li style="color:#059669;">${f}</li>`).join('')}</ul>`
    : ''

  const failedHtml = vars.failed.map(f =>
    `<li style="color:#dc2626;">${f.filename}${f.reason ? ` — ${f.reason}` : ''}</li>`
  ).join('')

  const succeededText = vars.succeeded.length > 0
    ? `Successfully saved:\n${vars.succeeded.map(f => `  - ${f}`).join('\n')}\n\n`
    : ''

  const failedText = `Could not be synced:\n${vars.failed.map(f => `  - ${f.filename}${f.reason ? ` (${f.reason})` : ''}`).join('\n')}`

  const fileWord = vars.failed.length > 1 ? 'files' : 'a file'

  const result = await client.sendEmail({
    From: FROM,
    To: vars.to,
    Subject: `We couldn't process ${fileWord} you sent — ${vars.firmName}`,
    HtmlBody: `
      <p>Hi ${firstName},</p>
      <p>Thank you for sending your documents to <strong>${vars.firmName}</strong>.</p>
      ${succeededHtml}
      <p><strong>The following file${vars.failed.length > 1 ? 's' : ''} could not be synced:</strong></p>
      <ul>${failedHtml}</ul>
      <p>Please re-upload them using your secure link:</p>
      <p>
        <a href="${vars.uploadLink}" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">
          Upload again
        </a>
      </p>
      <p>— The ${vars.firmName} team via Filio</p>
    `,
    TextBody: `Hi ${firstName},\n\nThank you for sending your documents to ${vars.firmName}.\n\n${succeededText}${failedText}\n\nPlease re-upload them: ${vars.uploadLink}\n\n— The ${vars.firmName} team via Filio`,
    MessageStream: 'outbound',
  })

  if (result.ErrorCode !== 0) {
    throw new Error(`Postmark error ${result.ErrorCode}: ${result.Message}`)
  }
}
