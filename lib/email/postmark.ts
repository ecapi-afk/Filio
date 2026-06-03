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
