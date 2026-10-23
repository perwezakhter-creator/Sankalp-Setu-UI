export interface InsertBroadcastMessageRequest {
  message_head?: string;
  message_body: string;
  photo1path?: string;
  photo2path?: string;
  videopath?: string;
  documentpath?: string;
  mesg_type_id?: number;
  entryby?: string;
  client_key?: string;
}

export interface BroadcastMessageData {
  bmsg_id: number;
  msg_id: number;
  mesg_type_id?: number;
  message_head?: string;
  message_body: string;
  validity_in_minutes?: number;
  is_active?: string;
  portal_id?: number;
  user_type_id?: string;
  photo1path?: string;
  photo2path?: string;
  videopath?: string;
  documentpath?: string;
  entryby?: string;
  entrydate?: string;
  updatedby?: string;
  updateddate?: string;
  is_synced?: string;
  is_deleted?: string;
  is_all_district?: string;
  is_verified?: boolean;
  verified_by?: string;
  verified_date?: string;
  verified_ip?: string;
  is_approved?: boolean;
  approved_by?: string;
  approved_date?: string;
  approved_ip?: string;
}

export interface ForwardDraftMessagesResponse {
  status: boolean;
  message: string;
  processedCount: number;
}

export interface UpdateBroadcastVerificationResponse {
  status: boolean;
  message: string;
  bmsg_id?: number;
  is_verified?: boolean;
  is_approved?: boolean;
}

export interface InsertBroadcastMessageResponse {
  status: boolean;
  message: string;
  bmsg_id?: number;
  data?: BroadcastMessageData;
}
