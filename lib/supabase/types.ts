// Database types for Filo - generated from Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      firms: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          brand_color: string
          portal_slug: string | null
          xero_connection_status: string
          xero_org_id: string | null
          xero_org_name: string | null
          xero_last_sync_at: string | null
          xero_tokens_encrypted: string | null
          xero_upload_mode: string
          notification_daily_summary: boolean
          notification_sync_failure: boolean
          notification_client_overdue: boolean
          created_at: string
          xero_refresh_token_expires_at: string | null
          reply_to_email: string | null
          default_reminder_days: number[] | null
          default_magic_email_sender_verified_only: boolean | null
          default_client_language: string | null
          default_backend_language: string | null
          timezone: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          brand_color?: string
          portal_slug?: string | null
          xero_connection_status?: string
          xero_org_id?: string | null
          xero_org_name?: string | null
          xero_last_sync_at?: string | null
          xero_tokens_encrypted?: string | null
          xero_upload_mode?: string
          notification_daily_summary?: boolean
          notification_sync_failure?: boolean
          notification_client_overdue?: boolean
          created_at?: string
          xero_refresh_token_expires_at?: string | null
          reply_to_email?: string | null
          default_reminder_days?: number[] | null
          default_magic_email_sender_verified_only?: boolean | null
          monthly_uploads_cache?: any
          default_client_language?: string | null
          default_backend_language?: string | null
          timezone?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          brand_color?: string
          portal_slug?: string | null
          xero_connection_status?: string
          xero_org_id?: string | null
          xero_org_name?: string | null
          xero_last_sync_at?: string | null
          xero_tokens_encrypted?: string | null
          xero_upload_mode?: string
          notification_daily_summary?: boolean
          notification_sync_failure?: boolean
          notification_client_overdue?: boolean
          created_at?: string
          xero_refresh_token_expires_at?: string | null
          reply_to_email?: string | null
          default_reminder_days?: number[] | null
          default_magic_email_sender_verified_only?: boolean | null
          default_client_language?: string | null
          default_backend_language?: string | null
          timezone?: string
        }
      }
      profiles: {
        Row: {
          id: string
          firm_id: string | null
          full_name: string | null
          position: string | null
          avatar_url: string | null
          language: string
          updated_at: string
        }
        Insert: {
          id: string
          firm_id?: string | null
          full_name?: string | null
          position?: string | null
          avatar_url?: string | null
          language?: string
          updated_at?: string
        }
        Update: {
          id?: string
          firm_id?: string | null
          full_name?: string | null
          position?: string | null
          avatar_url?: string | null
          language?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          firm_id: string
          name: string
          email: string | null
          portal_email: string | null
          is_starred: boolean
          health_status: string
          portal_status: string
          management_status: string
          management_status_reason: string | null
          xero_not_found: boolean
          dormant_reminded_at: string | null
          deleted_at: string | null
          activated_at: string | null
          dormanted_at: string | null
          archived_at: string | null
          created_at: string
          last_upload: string | null
          xero_contact_id: string | null
          xero_linked_contact_id: string | null
          portal_token: string | null
          vat_quarter_group: string | null
          current_period_completed: boolean
          financial_year_end: string | null
          auto_reminders_enabled: boolean
          reminder_days_before: number[] | null
          magic_email_slug: string | null
          magic_email_verified_only: boolean
          internal_notes: string | null
          checklist_override: string | null
          xero_phone: string | null
          // Cached / denormalized columns (maintained at write time)
          client_number: number
          next_deadline_date: string | null
          next_deadline_type: string | null
          uploads_count: number
          computed_health_status: string
        }
        Insert: {
          id?: string
          firm_id: string
          name: string
          email?: string | null
          portal_email?: string | null
          is_starred?: boolean
          health_status?: string
          portal_status?: string
          management_status?: string
          management_status_reason?: string | null
          xero_not_found?: boolean
          dormant_reminded_at?: string | null
          deleted_at?: string | null
          activated_at?: string | null
          dormanted_at?: string | null
          archived_at?: string | null
          created_at?: string
          last_upload?: string | null
          xero_contact_id?: string | null
          xero_linked_contact_id?: string | null
          portal_token?: string | null
          vat_quarter_group?: string | null
          financial_year_end?: string | null
          auto_reminders_enabled?: boolean
          reminder_days_before?: number[] | null
          magic_email_slug?: string | null
          magic_email_verified_only?: boolean
          internal_notes?: string | null
          checklist_override?: string | null
          current_period_completed?: boolean
          xero_phone?: string | null
        }
        Update: {
          id?: string
          firm_id?: string
          name?: string
          email?: string | null
          portal_email?: string | null
          is_starred?: boolean
          health_status?: string
          portal_status?: string
          management_status?: string
          management_status_reason?: string | null
          xero_not_found?: boolean
          dormant_reminded_at?: string | null
          deleted_at?: string | null
          activated_at?: string | null
          dormanted_at?: string | null
          archived_at?: string | null
          created_at?: string
          last_upload?: string | null
          xero_contact_id?: string | null
          xero_linked_contact_id?: string | null
          portal_token?: string | null
          vat_quarter_group?: string | null
          financial_year_end?: string | null
          auto_reminders_enabled?: boolean
          reminder_days_before?: number[] | null
          magic_email_slug?: string | null
          magic_email_verified_only?: boolean
          internal_notes?: string | null
          checklist_override?: string | null
          current_period_completed?: boolean
          xero_phone?: string | null
          // Cached fields
          next_deadline_date?: string | null
          next_deadline_type?: string | null
          uploads_count?: number
          computed_health_status?: string
        }
      }
      uploads: {
        Row: {
          id: string
          client_id: string
          filename: string
          original_filename: string | null
          file_type: string | null
          file_size: number | null
          storage_path: string | null
          xero_status: string
          xero_attachment_id: string | null
          channel: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          client_id: string
          filename: string
          original_filename?: string | null
          file_type?: string | null
          file_size?: number | null
          storage_path?: string | null
          xero_status?: string
          xero_attachment_id?: string | null
          channel?: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          filename?: string
          original_filename?: string | null
          file_type?: string | null
          file_size?: number | null
          storage_path?: string | null
          xero_status?: string
          xero_attachment_id?: string | null
          channel?: string
          uploaded_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          firm_id: string
          plan: string
          status: string
          client_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          plan?: string
          status?: string
          client_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          firm_id?: string
          plan?: string
          status?: string
          client_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          client_id: string
          upload_id: string | null
          type: string
          status: string
          attempts: number
          last_attempt_at: string | null
          error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          upload_id?: string | null
          type: string
          status?: string
          attempts?: number
          last_attempt_at?: string | null
          error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          upload_id?: string | null
          type?: string
          status?: string
          attempts?: number
          last_attempt_at?: string | null
          error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reminder_jobs: {
        Row: {
          id: string
          client_id: string
          request_id: string | null
          template: string
          scheduled_for: string
          status: string
          sent_at: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          request_id?: string | null
          template: string
          scheduled_for: string
          status?: string
          sent_at?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          request_id?: string | null
          template?: string
          scheduled_for?: string
          status?: string
          sent_at?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          firm_id: string
          client_id: string | null
          actor: string
          action: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          client_id?: string | null
          actor: string
          action: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          firm_id?: string
          client_id?: string | null
          actor?: string
          action?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      portal_tokens: {
        Row: {
          id: string
          client_id: string
          token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          token?: string
          expires_at?: string
          created_at?: string
        }
      }
      download_jobs: {
        Row: {
          id: string
          firm_id: string
          user_id: string
          status: string
          file_key: string | null
          error: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id: string
          user_id: string
          status?: string
          file_key?: string | null
          error?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          firm_id?: string
          user_id?: string
          status?: string
          file_key?: string | null
          error?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      requests: {
        Row: {
          id: string
          client_id: string
          title: string
          description: string | null
          deadline_date: string
          required_files: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          description?: string | null
          deadline_date: string
          required_files?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          description?: string | null
          deadline_date?: string
          required_files?: number
          status?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Firm = Database['public']['Tables']['firms']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Upload = Database['public']['Tables']['uploads']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type ReminderJob = Database['public']['Tables']['reminder_jobs']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type PortalToken = Database['public']['Tables']['portal_tokens']['Row']
export type DownloadJob = Database['public']['Tables']['download_jobs']['Row']
export type Request = Database['public']['Tables']['requests']['Row']

// Health status enum
export type HealthStatus =
  | 'Overdue'
  | 'Due Soon'
  | 'Not Started'
  | 'In Progress'
  | 'Complete'
  | 'No Action'

// Management status enum
export type ManagementStatus =
  | 'active'
  | 'dormant'
  | 'archived'
  | 'deleted'

// Portal status enum
export type PortalStatus =
  | 'Active'
  | 'Frozen'
  | 'Email Conflict'

// Job type enum
export type JobType =
  | 'xero_sync'
  | 'magic_email_process'
  | 'batch_download'

// Job status enum
export type JobStatus =
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'retry_scheduled'
  | 'cancelled'
