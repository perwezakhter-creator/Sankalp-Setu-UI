import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Campaign,
  CampaignAuditLog,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  VerifyCampaignRequest,
  ApproveCampaignRequest,
  CancelCampaignRequest,
  CampaignDeliveryReport,
  EstimateRecipientsResponse
} from '../models/campaign';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private apiUrl = this.baseUrl + '/MessageCampaign';
  private messageApiUrl = this.baseUrl + '/Message';

  /**
   * Current logged in user ID from localStorage
   */
  getCurrentUserId(): string {
    return localStorage.getItem('UserId') || localStorage.getItem('UserName') || 'Admin';
  }

  /**
   * Current user role from localStorage
   */
  getCurrentUserRole(): string {
    return localStorage.getItem('Role') || 'User';
  }

  isMaker(): boolean {
    const role = (this.getCurrentUserRole() || '').toUpperCase();
    return role === 'MKR' || role === 'MAKER';
  }

  isChecker(): boolean {
    const role = (this.getCurrentUserRole() || '').toUpperCase();
    return role === 'CKR' || role === 'CHECKER';
  }

  isApprover(): boolean {
    const role = (this.getCurrentUserRole() || '').toUpperCase();
    return role === 'APR' || role === 'APPROVER';
  }

  /**
   * Retrieve campaigns with search filters and pagination
   */
  getCampaigns(filter: {
    status?: string;
    portal_id?: number | null;
    user_type_id?: number | null;
    search_term?: string;
    from_date?: string;
    to_date?: string;
    page_number?: number;
    page_size?: number;
  } = {}): Observable<{
    status: boolean;
    totalCount: number;
    page: number;
    pageSize: number;
    data: Campaign[];
  }> {
    let params = new HttpParams();
    if (filter.status) params = params.set('Status', filter.status);
    if (filter.portal_id) params = params.set('PortalId', filter.portal_id.toString());
    if (filter.user_type_id) params = params.set('UserTypeId', filter.user_type_id.toString());
    if (filter.search_term) params = params.set('SearchTerm', filter.search_term);
    if (filter.from_date) params = params.set('FromDate', filter.from_date);
    if (filter.to_date) params = params.set('ToDate', filter.to_date);
    if (filter.page_number) params = params.set('PageNumber', filter.page_number.toString());
    if (filter.page_size) params = params.set('PageSize', filter.page_size.toString());

    return this.http.get<any>(`${this.apiUrl}/GetAll`, { params });
  }

  /**
   * Retrieve campaign details by ID
   */
  getCampaignById(id: number): Observable<{ status: boolean; data: Campaign }> {
    return this.http.get<any>(`${this.apiUrl}/GetById/${id}`);
  }

  /**
   * Create a new campaign
   */
  createCampaign(request: CreateCampaignRequest): Observable<any> {
    if (!request.created_by) {
      request.created_by = this.getCurrentUserId();
    }
    return this.http.post<any>(`${this.apiUrl}/Create`, request);
  }

  /**
   * Update an existing campaign (Draft / Pending Verification only)
   */
  updateCampaign(id: number, request: UpdateCampaignRequest): Observable<any> {
    if (!request.updated_by) {
      request.updated_by = this.getCurrentUserId();
    }
    return this.http.put<any>(`${this.apiUrl}/Update/${id}`, request);
  }

  /**
   * Verify a campaign
   */
  verifyCampaign(request: VerifyCampaignRequest): Observable<any> {
    if (!request.verified_by) {
      request.verified_by = this.getCurrentUserId();
    }
    return this.http.put<any>(`${this.apiUrl}/IsVerified`, request);
  }

  /**
   * Approve a campaign (enforces creator cannot approve)
   */
  approveCampaign(request: ApproveCampaignRequest): Observable<any> {
    if (!request.approved_by) {
      request.approved_by = this.getCurrentUserId();
    }
    return this.http.put<any>(`${this.apiUrl}/IsApproved`, request);
  }

  /**
   * Send an approved or scheduled campaign
   */
  sendCampaign(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Send/${id}`, {});
  }

  /**
   * Cancel an active or pending campaign
   */
  cancelCampaign(id: number, reason: string): Observable<any> {
    const request: CancelCampaignRequest = {
      campaign_id: id,
      reason,
      cancelled_by: this.getCurrentUserId()
    };
    return this.http.post<any>(`${this.apiUrl}/Cancel/${id}`, request);
  }

  /**
   * Get delivery statistics and recipient-level log details
   */
  getDeliveryReport(id: number): Observable<{ status: boolean; data: CampaignDeliveryReport }> {
    return this.http.get<any>(`${this.apiUrl}/DeliveryReport/${id}`);
  }

  /**
   * Get complete audit history trail for campaign
   */
  getAuditHistory(id: number): Observable<{ status: boolean; data: CampaignAuditLog[] }> {
    return this.http.get<any>(`${this.apiUrl}/AuditHistory/${id}`);
  }

  /**
   * Estimate candidate audience size based on targeting criteria
   */
  estimateRecipients(request: any): Observable<{ status: boolean; data: EstimateRecipientsResponse }> {
    return this.http.post<any>(`${this.apiUrl}/EstimateRecipients`, request);
  }

  /**
   * Helpers for dropdown selection
   */
  getPortals(): Observable<{ status: boolean; data: any[] }> {
    return this.http.get<any>(`${this.apiUrl}/GetPortals`);
  }

  getUserTypes(portalId: number): Observable<{ status: boolean; data: any[] }> {
    return this.http.get<any>(`${this.apiUrl}/GetUserTypes/${portalId}`);
  }

  getDistricts(): Observable<{ status: boolean; data: any[] }> {
    return this.http.get<any>(`${this.apiUrl}/GetDistricts`);
  }

  getBlocks(distCode: string): Observable<{ status: boolean; data: any[] }> {
    return this.http.get<any>(`${this.apiUrl}/GetBlocks/${distCode}`);
  }

  /**
   * Get list of existing broadcast notices to reuse
   */
  getExistingBroadcastMessages(): Observable<any> {
    return this.http.post<any>(`${this.messageApiUrl}/GetBroadCastMessage`, {});
  }
}
