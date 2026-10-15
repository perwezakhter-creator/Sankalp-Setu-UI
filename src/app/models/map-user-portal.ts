export interface MapUserPortalRequest {
  portal_id?: number;
  user_type_id?: number;
}

export interface MapUserPortalData {
  user_portal_id: number | null;
  portal_id: number | null;
  portal_name?: string;
  user_type_id?: number;
  user_type_name?: string;
  mobile?: string;
  userid?: string;
  deviceid?: string;
  district_code?: number | null;
  block_code?: number | null;
  panchayatcode?: number | null;
  entry_by?: string;
  entry_date?: string;
}

export interface MapUserPortalResponse {
  status: boolean;
  message: string;
  count?: number;
  data?: MapUserPortalData[];
}

export interface SendToUserRequest {
  userId: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

export interface SendToUserResponse {
  success: boolean;
  message: string;
  userId?: string | null;
  totalDevices: number;
  successCount: number;
  failureCount: number;
  deactivatedTokenCount: number;
}
