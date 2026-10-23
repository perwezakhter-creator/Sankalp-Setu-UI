import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  InsertBroadcastMessageRequest,
  InsertBroadcastMessageResponse,
  ForwardDraftMessagesResponse,
  UpdateBroadcastVerificationResponse
} from '../models/broadcast-message';
import {
  InsertInterestWiseMessageRequest,
  InsertInterestWiseMessageResponse,
  GetInterestWiseMessageRequest,
  GetInterestWiseMessageResponse
} from '../models/interest-message';
import { SendToUserRequest, SendToUserResponse } from '../models/map-user-portal';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl; 
  private apiUrl = `${this.baseUrl}/Message`;
  private notificationApiUrl = `${this.baseUrl}/Notifications`;
  private masterApiUrl = `${this.baseUrl}/Master`;

  /**

   * @param request The broadcast message payload
   * @returns Observable of InsertBroadcastMessageResponse containing status, message, and generated bmsg_id
   */
  insertBroadcastMessage(request: InsertBroadcastMessageRequest): Observable<InsertBroadcastMessageResponse> {
    return this.http.post<InsertBroadcastMessageResponse>(
      `${this.apiUrl}/InsertBroadcastMessage`,
      request
    );
  }

  /**
   * Retrieves all active broadcast messages from SQL Server (tbl_BroadCastMessage).
   */
  getBroadcastMessages(deviceId?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/GetBroadCastMessage`, {
      DeviceID: deviceId?.trim() || ''
    });
  }

  getMessageTypes(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/GetMessageType`, {});
  }

  forwardDraftMessages(bmsgIds: number[]): Observable<ForwardDraftMessagesResponse> {
    return this.http.post<ForwardDraftMessagesResponse>(`${this.apiUrl}/ForwardDraftMessages`, {
      bmsg_ids: bmsgIds,
      user_role: localStorage.getItem('Role') || '',
      action_by: localStorage.getItem('UserId') || localStorage.getItem('UserName') || ''
    });
  }

  updateBroadcastVerification(
    bmsgId: number,
    isVerified: boolean
  ): Observable<UpdateBroadcastVerificationResponse> {
    return this.http.post<UpdateBroadcastVerificationResponse>(`${this.apiUrl}/IsVerified`, {
      Bmsg_id: bmsgId,
      IsVerified: isVerified,
      VerifiedBy: localStorage.getItem('UserId') || localStorage.getItem('UserName') || 'Checker'
    });
  }

  updateBroadcastApproval(
    bmsgId: number,
    isApproved: boolean
  ): Observable<UpdateBroadcastVerificationResponse> {
    return this.http.post<UpdateBroadcastVerificationResponse>(`${this.apiUrl}/IsApproved`, {
      Bmsg_id: bmsgId,
      IsApproved: isApproved,
      ApprovedBy: localStorage.getItem('UserId') || localStorage.getItem('UserName') || 'Approver'
    });
  }

  /**

   * @param request Payload with userId, title, body, optional imageUrl and data
   */
  sendToUser(request: SendToUserRequest): Observable<SendToUserResponse> {
    return this.http.post<SendToUserResponse>(`${this.notificationApiUrl}/send-to-user`, request);
  }

  /**
  
   * @param request Payload with interest_id, message_head, message_body, media links, etc.
   */
  insertInterestWiseMessage(request: InsertInterestWiseMessageRequest): Observable<InsertInterestWiseMessageResponse> {
    return this.http.post<InsertInterestWiseMessageResponse>(
      `${this.apiUrl}/InsertInterestWiseMessage`,
      request
    );
  }

  /**
   * Retrieves interest-wise messages from SQL Server (tbl_Message).
   * @param interestId Optional interest_id to filter messages by category
   */
  getInterestWiseMessages(interestId?: number): Observable<any> {
    const url = interestId ? `${this.apiUrl}/GetInterestWiseMessages?interestId=${interestId}` : `${this.apiUrl}/GetInterestWiseMessages`;
    return this.http.get<any>(url);
  }

  /**
   * Retrieves the interest-wise message for a given user's selected interest.
   * @param request Payload with deviceID, clientKey and interest_id
   */
  getInterestWiseMessage(request: GetInterestWiseMessageRequest): Observable<GetInterestWiseMessageResponse> {
    return this.http.post<GetInterestWiseMessageResponse>(
      `${this.apiUrl}/GetInterestWiseMessage`,
      request
    );
  }

  /**
   * Retrieves the master list of departments/interests from mst_interest.
   */
  getInterestList(): Observable<any> {
    return this.http.post<any>(`${this.masterApiUrl}/GetInterestList`, {});
  }
}
