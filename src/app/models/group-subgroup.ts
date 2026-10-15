export interface Group {
  portal_id: number;
  portal_name: string;
  portal_url?: string | null;
  portal_image_path?: string | null;
  is_active: 'Y' | 'N' | string;
}

export interface SubGroup {
  id: number;
  portal_id: number;
  portal_name: string;
  user_type_id: number;
  user_type_name: string;
  user_type_name_hn?: string | null;
  is_active: 'Y' | 'N' | string;
}

export interface GroupManagementData {
  groups: Group[];
  sub_groups: SubGroup[];
}

export interface GroupManagementResponse<T> {
  status: boolean;
  message: string;
  data?: T;
}

export interface CreateGroupRequest {
  portal_name: string;
  portal_url?: string;
  portal_image_path?: string;
  is_active: 'Y' | 'N';
}

export interface CreateSubGroupRequest {
  portal_id: number;
  user_type_name: string;
  user_type_name_hn?: string;
  is_active: 'Y' | 'N';
}
