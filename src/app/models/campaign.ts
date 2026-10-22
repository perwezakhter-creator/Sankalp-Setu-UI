export type CampaignStatus =
  | 'DRAFT'
  | 'SUBMITTED_FOR_VERIFICATION'
  | 'REJECTED_BY_CKR'
  | 'PENDING_APPROVAL'
  | 'REJECTED_BY_APR'
  | 'APPROVED'
  | 'SENDING'
  | 'SENT'
  | 'SEND_FAILED';

export const CAMPAIGN_ROLES = {
  MAKER: 'MKR',
  CHECKER: 'CKR',
  APPROVER: 'APR',
} as const;

export type CampaignRole = typeof CAMPAIGN_ROLES[keyof typeof CAMPAIGN_ROLES];

export interface CampaignLocation {
  district_code?: number | null;
  district_name?: string | null;
  block_code?: number | null;
  block_name?: string | null;
  panchayat_code?: number | null;
}

export interface BroadcastMessageSummary {
  bmsg_id: number;
  message_head?: string;
  message_body?: string;
  validity_in_minutes?: number;
  is_active?: string;
  photo1path?: string;
  photo2path?: string;
  videopath?: string;
  documentpath?: string;
  entryby?: string;
  entrydate?: string;
}

export interface CampaignAuditLog {
  audit_id: number;
  campaign_id: number;
  action: string;
  from_status?: string | null;
  to_status: string;
  action_by: string;
  action_role?: string | null;
  action_date: string;
  remarks?: string | null;
  action_ip?: string | null;
}

export interface Campaign {
  campaign_id: number;
  campaign_name: string;
  campaign_description?: string;
  bmsg_id: number;
  campaign_status: string; // DRAFT, SUBMITTED_FOR_VERIFICATION, REJECTED_BY_CKR, PENDING_APPROVAL, REJECTED_BY_APR, APPROVED, SENDING, SENT, SEND_FAILED
  start_date?: string;
  end_date?: string;
  scheduled_send_time?: string;
  actual_send_time?: string;
  completed_time?: string;
  target_scope: string; // ALL, PORTAL, USER_TYPE, LOCATION
  portal_id?: number | null;
  portal_name?: string;
  user_type_id?: number | null;
  user_type_name?: string;
  is_all_district: string;
  is_all_block: string;
  is_all_panchayat: string;
  total_recipients_targeted: number;
  total_sent_success: number;
  total_sent_failed: number;
  total_skipped: number;
  is_verified: string;
  verified_by?: string;
  verified_date?: string;
  is_approved: string;
  approved_by?: string;
  approved_date?: string;
  rejection_reason?: string;
  verified_remarks?: string;
  approved_remarks?: string;
  last_action_role?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_date?: string;
  created_by: string;
  created_date: string;
  updated_by?: string;
  updated_date?: string;
  broadcast_message?: BroadcastMessageSummary;
  message_head?: string;
  message_body?: string;
  photo1path?: string;
  photo2path?: string;
  videopath?: string;
  documentpath?: string;
  target_locations?: CampaignLocation[];
  audit_history?: CampaignAuditLog[];
}

export interface CreateCampaignRequest {
  campaign_name: string;
  campaign_description?: string;
  bmsg_id?: number | null;
  new_broadcast_message?: {
    message_head: string;
    message_body: string;
    validity_in_minutes?: number;
    photo1path?: string;
    photo2path?: string;
    videopath?: string;
    documentpath?: string;
  };
  message_details?: {
    message_head: string;
    message_body: string;
    validity_in_minutes?: number;
    photo1path?: string;
    photo2path?: string;
    videopath?: string;
    documentpath?: string;
  };
  start_date?: string;
  end_date?: string;
  scheduled_send_time?: string;
  target_scope: string;
  portal_id?: number | null;
  user_type_id?: number | null;
  is_all_district: string;
  is_all_block: string;
  is_all_panchayat: string;
  target_locations?: CampaignLocation[];
  submit_for_verification: boolean;
  created_by?: string;
}

export interface UpdateCampaignRequest {
  campaign_name: string;
  campaign_description?: string;
  bmsg_id?: number | null;
  start_date?: string;
  end_date?: string;
  scheduled_send_time?: string;
  target_scope: string;
  portal_id?: number | null;
  user_type_id?: number | null;
  is_all_district: string;
  is_all_block: string;
  is_all_panchayat: string;
  target_locations?: CampaignLocation[];
  submit_for_verification: boolean;
  updated_by?: string;
}

export interface VerifyCampaignRequest {
  campaign_id: number;
  is_verified: string; // 'Y' or 'N'
  remarks?: string;
  verified_remarks?: string;
  rejection_reason?: string;
  verified_by?: string;
}

export interface ApproveCampaignRequest {
  campaign_id: number;
  is_approved: string; // 'Y' or 'N'
  remarks?: string;
  approval_remarks?: string;
  approved_remarks?: string;
  rejection_reason?: string;
  approved_by?: string;
}

export interface CancelCampaignRequest {
  campaign_id: number;
  reason?: string;
  cancelled_by?: string;
}

export interface CampaignDeliveryLog {
  delivery_log_id: number;
  campaign_id: number;
  bmsg_id: number;
  user_id?: string;
  device_id?: string;
  fcm_token?: string;
  platform?: string;
  status: string; // AcceptedByFcm, Failed, Skipped
  fcm_message_id?: string;
  error_code?: string;
  error_message?: string;
  attempt_count: number;
  sent_at_utc: string;
}

export interface CampaignDeliveryReport {
  campaign_id: number;
  campaign_name: string;
  bmsg_id: number;
  message_head?: string;
  message_body?: string;
  campaign_status: string;
  scheduled_send_time?: string;
  actual_send_time?: string;
  completed_time?: string;
  total_recipients_targeted: number;
  total_sent_success: number;
  total_sent_failed: number;
  total_skipped: number;
  delivery_logs: CampaignDeliveryLog[];
}

export interface EstimateRecipientsResponse {
  estimated_recipient_count: number;
  estimated_devices_count: number;
  platform_breakdown?: Record<string, number>;
}
