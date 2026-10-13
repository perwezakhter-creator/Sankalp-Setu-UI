export interface InsertBroadcastMessageRequest {
  message_head?: string;
  message_body: string;
  validity_in_minutes?: number;
  is_active?: 'Y' | 'N';
  portal_id?: number;
  user_type_id?: string;
  photo1path?: string;
  photo2path?: string;
  videopath?: string;
  documentpath?: string;
  entryby?: string;
  client_key?: string;
}

export interface BroadcastMessageData {
  bmsg_id: number;
  msg_id: number;
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
}

export interface InsertBroadcastMessageResponse {
  status: boolean;
  message: string;
  bmsg_id?: number;
  data?: BroadcastMessageData;
}
