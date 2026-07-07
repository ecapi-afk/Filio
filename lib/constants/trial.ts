export const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000

export const TRIAL_EXPIRED_ERROR = 'trial_expired'

export function trialExpiredMessage(action: string): string {
  return `Your trial has expired. Upgrade to ${action}.`
}
