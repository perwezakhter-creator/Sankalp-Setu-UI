import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CampaignService } from '../../services/campaign.service';
import {
  Campaign,
  CampaignAuditLog,
  CampaignDeliveryReport,
  VerifyCampaignRequest,
  ApproveCampaignRequest
} from '../../models/campaign';

@Component({
  selector: 'app-campaign-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './campaign-list.html',
  styleUrl: './campaign-list.css'
})
export class CampaignListComponent implements OnInit {
  private campaignService = inject(CampaignService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Campaign data
  campaigns: Campaign[] = [];
  totalCount = 0;
  isLoading = false;

  // Filter criteria
  statusFilter = '';
  selectedPortalId: number | null = null;
  searchTerm = '';
  fromDate = '';
  toDate = '';
  pageNumber = 1;
  pageSize = 10;

  // Dropdown options
  portals: any[] = [];

  // Notification banners
  successMessage = '';
  errorMessage = '';

  // Current logged in user info & roles
  currentUserId = '';
  currentUserRole = '';
  isMaker = false;
  isChecker = false;
  isApprover = false;

  // Delivery Report Modal state
  showReportModal = false;
  selectedReport: CampaignDeliveryReport | null = null;
  isLoadingReport = false;
  reportStatusFilter = 'ALL';
  reportSearchTerm = '';

  // Verification Modal state
  showVerifyModal = false;
  activeCampaignForAction: Campaign | null = null;
  verifyDecision: 'Y' | 'N' = 'Y';
  verifyRemarks = '';
  verifyRejectionReason = '';
  isSubmittingAction = false;

  // Approval Modal state
  showApproveModal = false;
  approveDecision: 'Y' | 'N' = 'Y';
  approveRemarks = '';
  approveRejectionReason = '';
  approverIdentity = '';

  // Cancellation Modal state
  showCancelModal = false;
  cancelReason = '';

  // Audit History Modal state
  showAuditModal = false;
  activeCampaignForAudit: Campaign | null = null;
  auditHistory: CampaignAuditLog[] = [];
  isLoadingAudit = false;

  ngOnInit(): void {
    this.currentUserId = this.campaignService.getCurrentUserId();
    this.currentUserRole = (this.campaignService.getCurrentUserRole() || '').toUpperCase();

    this.isMaker = this.currentUserRole === 'MKR' || this.currentUserRole === 'MAKER';
    this.isChecker = this.currentUserRole === 'CKR' || this.currentUserRole === 'CHECKER';
    this.isApprover = this.currentUserRole === 'APR' || this.currentUserRole === 'APPROVER';

    // Smart default status filter depending on active role
    if (this.isChecker) {
      this.statusFilter = 'SUBMITTED_FOR_VERIFICATION';
    } else if (this.isApprover) {
      this.statusFilter = 'PENDING_APPROVAL';
    }

    this.loadPortals();
    this.loadCampaigns();
  }

  loadPortals(): void {
    this.campaignService.getPortals().subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.portals = list.map((p: any) => ({
          portal_id: Number(p.portal_id ?? p.PortalId ?? 0),
          portal_name: p.portal_name ?? p.PortalName ?? `Portal ${p.portal_id ?? p.PortalId}`
        })).filter((p: any) => p.portal_id > 0);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load portals:', err);
        this.cdr.detectChanges();
      }
    });
  }

  loadCampaigns(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.campaignService
      .getCampaigns({
        status: this.statusFilter || undefined,
        portal_id: this.selectedPortalId,
        search_term: this.searchTerm || undefined,
        from_date: this.fromDate || undefined,
        to_date: this.toDate || undefined,
        page_number: this.pageNumber,
        page_size: this.pageSize
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res && res.status) {
            this.campaigns = res.data || [];
            this.totalCount = res.totalCount ?? (this.campaigns ? this.campaigns.length : 0);
          } else {
            this.campaigns = [];
            this.totalCount = 0;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Failed to load campaigns:', err);
          this.showError('Failed to load campaigns: ' + (err.error?.message || err.message));
          this.cdr.detectChanges();
        }
      });
  }

  onFilterChange(): void {
    this.pageNumber = 1;
    this.loadCampaigns();
  }

  resetFilters(): void {
    this.statusFilter = '';
    if (this.isChecker) {
      this.statusFilter = 'SUBMITTED_FOR_VERIFICATION';
    } else if (this.isApprover) {
      this.statusFilter = 'PENDING_APPROVAL';
    }
    this.selectedPortalId = null;
    this.searchTerm = '';
    this.fromDate = '';
    this.toDate = '';
    this.pageNumber = 1;
    this.loadCampaigns();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.pageNumber = page;
    this.loadCampaigns();
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }

  // Action: Open Verify Modal
  openVerifyModal(c: Campaign): void {
    this.activeCampaignForAction = c;
    this.verifyDecision = 'Y';
    this.verifyRemarks = '';
    this.verifyRejectionReason = '';
    this.showVerifyModal = true;
    this.cdr.detectChanges();
  }

  closeVerifyModal(): void {
    this.showVerifyModal = false;
    this.activeCampaignForAction = null;
    this.cdr.detectChanges();
  }

  submitVerify(): void {
    if (!this.activeCampaignForAction) return;

    // Enforce mandatory rejection reason
    if (this.verifyDecision === 'N') {
      const reason = (this.verifyRejectionReason || this.verifyRemarks || '').trim();
      if (!reason) {
        this.showError('Rejection reason is mandatory when rejecting a campaign.');
        return;
      }
      this.verifyRejectionReason = reason;
    }

    this.isSubmittingAction = true;
    this.cdr.detectChanges();

    const req: VerifyCampaignRequest = {
      campaign_id: this.activeCampaignForAction.campaign_id,
      is_verified: this.verifyDecision,
      remarks: this.verifyRemarks.trim() || undefined,
      verified_remarks: this.verifyRemarks.trim() || undefined,
      rejection_reason: this.verifyDecision === 'N' ? this.verifyRejectionReason.trim() : undefined,
      verified_by: this.currentUserId
    };

    this.campaignService.verifyCampaign(req).subscribe({
      next: (res) => {
        this.isSubmittingAction = false;
        this.closeVerifyModal();
        this.showSuccess(res.message || 'Campaign verification recorded successfully.');
        this.loadCampaigns();
      },
      error: (err) => {
        this.isSubmittingAction = false;
        this.showError(err.error?.message || 'Verification failed.');
        this.cdr.detectChanges();
      }
    });
  }

  // Action: Open Approve Modal
  openApproveModal(c: Campaign): void {
    this.activeCampaignForAction = c;
    this.approveDecision = 'Y';
    this.approveRemarks = '';
    this.approveRejectionReason = '';
    this.approverIdentity = this.currentUserId;
    this.showApproveModal = true;
    this.cdr.detectChanges();
  }

  closeApproveModal(): void {
    this.showApproveModal = false;
    this.activeCampaignForAction = null;
    this.cdr.detectChanges();
  }

  submitApprove(): void {
    if (!this.activeCampaignForAction) return;

    const approver = this.approverIdentity.trim() || this.currentUserId;

    // Dual-control check
    if (this.isCreator(this.activeCampaignForAction) && approver.toLowerCase() === this.activeCampaignForAction.created_by.toLowerCase()) {
      this.showError('Dual Control Enforcement: The campaign creator (Maker) cannot approve their own campaign. A separate Approver is required.');
      return;
    }

    // Enforce mandatory rejection reason
    if (this.approveDecision === 'N') {
      const reason = (this.approveRejectionReason || this.approveRemarks || '').trim();
      if (!reason) {
        this.showError('Rejection reason is mandatory when rejecting a campaign.');
        return;
      }
      this.approveRejectionReason = reason;
    }

    this.isSubmittingAction = true;
    this.cdr.detectChanges();

    const req: ApproveCampaignRequest = {
      campaign_id: this.activeCampaignForAction.campaign_id,
      is_approved: this.approveDecision,
      approval_remarks: this.approveRemarks.trim() || undefined,
      approved_remarks: this.approveRemarks.trim() || undefined,
      remarks: this.approveRemarks.trim() || undefined,
      rejection_reason: this.approveDecision === 'N' ? this.approveRejectionReason.trim() : undefined,
      approved_by: approver
    };

    this.campaignService.approveCampaign(req).subscribe({
      next: (res) => {
        this.isSubmittingAction = false;
        this.closeApproveModal();
        this.showSuccess(res.message || 'Campaign approval recorded successfully.');
        this.loadCampaigns();
      },
      error: (err) => {
        this.isSubmittingAction = false;
        this.showError(err.error?.message || 'Approval failed.');
        this.cdr.detectChanges();
      }
    });
  }

  // Action: Send Campaign (Maker Only)
  sendNow(c: Campaign): void {
    const norm = this.normalizeStatus(c.campaign_status);
    if (norm !== 'APPROVED') {
      this.showError('Only campaigns with final status APPROVED can be sent.');
      return;
    }

    if (!confirm(`Are you sure you want to trigger dispatch for approved campaign "${c.campaign_name}" now?`)) {
      return;
    }

    this.isLoading = true;
    this.campaignService.sendCampaign(c.campaign_id).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.showSuccess(res.message || 'Campaign dispatched successfully.');
        this.loadCampaigns();
      },
      error: (err) => {
        this.isLoading = false;
        this.showError(err.error?.message || 'Failed to send campaign.');
        this.cdr.detectChanges();
      }
    });
  }

  // Action: Open Cancel Modal
  openCancelModal(c: Campaign): void {
    this.activeCampaignForAction = c;
    this.cancelReason = '';
    this.showCancelModal = true;
    this.cdr.detectChanges();
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.activeCampaignForAction = null;
    this.cdr.detectChanges();
  }

  submitCancel(): void {
    if (!this.activeCampaignForAction) return;
    if (!this.cancelReason.trim()) {
      alert('Please specify a cancellation reason.');
      return;
    }

    this.isSubmittingAction = true;
    this.campaignService.cancelCampaign(this.activeCampaignForAction.campaign_id, this.cancelReason).subscribe({
      next: (res) => {
        this.isSubmittingAction = false;
        this.closeCancelModal();
        this.showSuccess(res.message || 'Campaign cancelled.');
        this.loadCampaigns();
      },
      error: (err) => {
        this.isSubmittingAction = false;
        this.showError(err.error?.message || 'Failed to cancel campaign.');
        this.cdr.detectChanges();
      }
    });
  }

  // Action: View Delivery Report Modal
  openReportModal(c: Campaign): void {
    this.isLoadingReport = true;
    this.showReportModal = true;
    this.selectedReport = null;
    this.reportStatusFilter = 'ALL';
    this.reportSearchTerm = '';
    this.cdr.detectChanges();

    this.campaignService.getDeliveryReport(c.campaign_id).subscribe({
      next: (res) => {
        this.isLoadingReport = false;
        if (res.status) {
          this.selectedReport = res.data;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingReport = false;
        this.showError('Unable to load delivery report: ' + (err.error?.message || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  closeReportModal(): void {
    this.showReportModal = false;
    this.selectedReport = null;
    this.cdr.detectChanges();
  }

  // Action: View Audit History Modal
  openAuditModal(c: Campaign): void {
    this.activeCampaignForAudit = c;
    this.showAuditModal = true;
    this.isLoadingAudit = true;
    this.auditHistory = [];
    this.cdr.detectChanges();

    this.campaignService.getAuditHistory(c.campaign_id).subscribe({
      next: (res) => {
        this.isLoadingAudit = false;
        this.auditHistory = res?.data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoadingAudit = false;
        this.showError('Failed to load audit history: ' + (err.error?.message || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  closeAuditModal(): void {
    this.showAuditModal = false;
    this.activeCampaignForAudit = null;
    this.auditHistory = [];
    this.cdr.detectChanges();
  }

  get filteredReportLogs(): any[] {
    if (!this.selectedReport?.delivery_logs) return [];
    let list = this.selectedReport.delivery_logs;

    if (this.reportStatusFilter !== 'ALL') {
      list = list.filter((l) => l.status === this.reportStatusFilter);
    }

    if (this.reportSearchTerm.trim()) {
      const term = this.reportSearchTerm.toLowerCase();
      list = list.filter(
        (l) =>
          (l.user_id && l.user_id.toLowerCase().includes(term)) ||
          (l.device_id && l.device_id.toLowerCase().includes(term)) ||
          (l.fcm_message_id && l.fcm_message_id.toLowerCase().includes(term)) ||
          (l.error_message && l.error_message.toLowerCase().includes(term))
      );
    }

    return list;
  }

  // Normalization helper
  normalizeStatus(status?: string): string {
    if (!status) return 'DRAFT';
    const s = status.toUpperCase().trim();
    if (s === 'DRAFT') return 'DRAFT';
    if (s === 'SUBMITTED_FOR_VERIFICATION' || s === 'PENDING VERIFICATION' || s === 'SUBMITTED' || s === 'PENDING_VERIFICATION') return 'SUBMITTED_FOR_VERIFICATION';
    if (s === 'REJECTED_BY_CKR' || s === 'REJECTED_BY_CHECKER' || s === 'REJECTED') return 'REJECTED_BY_CKR';
    if (s === 'PENDING_APPROVAL' || s === 'PENDING APPROVAL') return 'PENDING_APPROVAL';
    if (s === 'REJECTED_BY_APR' || s === 'REJECTED_BY_APPROVER') return 'REJECTED_BY_APR';
    if (s === 'APPROVED') return 'APPROVED';
    if (s === 'SENDING') return 'SENDING';
    if (s === 'SENT' || s === 'COMPLETED') return 'SENT';
    if (s === 'SEND_FAILED' || s === 'FAILED' || s === 'PARTIALLY FAILED') return 'SEND_FAILED';
    if (s === 'CANCELLED') return 'CANCELLED';
    return s;
  }

  // Permission helpers
  isCreator(c: Campaign): boolean {
    if (!c.created_by || !this.currentUserId) return false;
    return c.created_by.trim().toLowerCase() === this.currentUserId.trim().toLowerCase();
  }

  canCreate(): boolean {
    return !this.isChecker && !this.isApprover;
  }

  canEdit(c: Campaign): boolean {
    if (this.isChecker || this.isApprover) return false;
    const norm = this.normalizeStatus(c.campaign_status);
    return norm === 'DRAFT' || norm === 'SUBMITTED_FOR_VERIFICATION' || norm === 'REJECTED_BY_CKR' || norm === 'REJECTED_BY_APR';
  }

  canVerify(c: Campaign): boolean {
    if (this.isMaker || this.isApprover) return false;
    if (this.isCreator(c)) return false;
    const norm = this.normalizeStatus(c.campaign_status);
    return norm === 'SUBMITTED_FOR_VERIFICATION';
  }

  canApprove(c: Campaign): boolean {
    if (this.isMaker || this.isChecker) return false;
    if (this.isCreator(c)) return false; // dual control
    const norm = this.normalizeStatus(c.campaign_status);
    return norm === 'PENDING_APPROVAL';
  }

  canSend(c: Campaign): boolean {
    if (this.isChecker || this.isApprover) return false;
    const norm = this.normalizeStatus(c.campaign_status);
    return norm === 'APPROVED' && c.is_approved === 'Y';
  }

  canCancel(c: Campaign): boolean {
    if (this.isChecker || this.isApprover) return false;
    const norm = this.normalizeStatus(c.campaign_status);
    return norm === 'DRAFT' || norm === 'SUBMITTED_FOR_VERIFICATION' || norm === 'PENDING_APPROVAL';
  }

  getStatusClass(status: string): string {
    const s = this.normalizeStatus(status);
    switch (s) {
      case 'DRAFT':
        return 'badge-draft';
      case 'SUBMITTED_FOR_VERIFICATION':
        return 'badge-submitted';
      case 'REJECTED_BY_CKR':
        return 'badge-rejected-ckr';
      case 'PENDING_APPROVAL':
        return 'badge-pending-approval';
      case 'REJECTED_BY_APR':
        return 'badge-rejected-apr';
      case 'APPROVED':
        return 'badge-approved';
      case 'SCHEDULED':
        return 'badge-scheduled';
      case 'SENDING':
        return 'badge-sending';
      case 'SENT':
        return 'badge-sent';
      case 'SEND_FAILED':
        return 'badge-send-failed';
      case 'CANCELLED':
        return 'badge-cancelled';
      default:
        return 'badge-default';
    }
  }

  showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 6000);
  }

  showError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
    this.cdr.detectChanges();
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 7000);
  }
}
