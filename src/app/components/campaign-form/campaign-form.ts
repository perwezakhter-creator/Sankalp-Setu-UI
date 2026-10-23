import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CampaignService } from '../../services/campaign.service';
import { PortalService } from '../../services/portal';
import { GroupService } from '../../services/group.service';
import { DistrictService } from '../../services/district';
import { BlockService } from '../../services/block';
import { CryptoService } from '../../services/crypto.service';
import {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignLocation,
  EstimateRecipientsResponse
} from '../../models/campaign';

interface NormalizedPortal {
  portal_id: number;
  portal_name: string;
}

interface NormalizedUserType {
  user_type_id: number;
  user_type_name: string;
}

interface NormalizedDistrict {
  dist_code: number;
  dist_name: string;
}

interface NormalizedBlock {
  block_code: number;
  block_name: string;
}

@Component({
  selector: 'app-campaign-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './campaign-form.html',
  styleUrl: './campaign-form.css'
})
export class CampaignFormComponent implements OnInit, OnDestroy {
  private fbService = inject(CampaignService);
  private portalService = inject(PortalService);
  private groupService = inject(GroupService);
  private districtService = inject(DistrictService);
  private blockService = inject(BlockService);
  private cryptoService = inject(CryptoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  private routeSub?: Subscription;

  isEditMode = false;
  campaignId: number | null = null;
  loadedCampaign: Campaign | null = null;
  isLoading = false;
  isSaving = false;
  accessDenied = false;
  accessDeniedMessage = '';

  // Feedback banners
  successMessage = '';
  errorMessage = '';

  // Mode: 'existing' vs 'new'
  messageSourceMode: 'existing' | 'new' = 'new';
  existingNotices: any[] = [];
  selectedNoticeDetails: any = null;

  // Dropdown datasets (normalized)
  portals: NormalizedPortal[] = [];
  portalsLoading = false;

  userTypes: NormalizedUserType[] = [];
  userTypesLoading = false;

  districts: NormalizedDistrict[] = [];
  districtsLoading = false;

  blocks: NormalizedBlock[] = [];
  blocksLoading = false;

  // Selected target locations
  targetLocations: CampaignLocation[] = [];
  selectedDistrictCode: number | null = null;
  selectedBlockCode: number | null = null;

  // Estimated reach
  estimatedReach: EstimateRecipientsResponse | null = null;
  isEstimating = false;

  // Current logged in user
  currentUserId = '';

  campaignForm = new FormGroup({
    campaign_name: new FormControl('', [Validators.required, Validators.maxLength(250)]),
    campaign_description: new FormControl(''),
    bmsg_id: new FormControl<number | null>(null),

    // New broadcast content
    message_head: new FormControl(''),
    message_body: new FormControl(''),
    validity_in_minutes: new FormControl<number>(1440),
    photo1path: new FormControl(''),
    photo2path: new FormControl(''),
    videopath: new FormControl(''),
    documentpath: new FormControl(''),

    // Dates
    start_date: new FormControl(''),
    end_date: new FormControl(''),
    scheduled_send_time: new FormControl(''),

    // Target scope
    target_scope: new FormControl('ALL', [Validators.required]),
    portal_id: new FormControl<number | null>(null),
    user_type_id: new FormControl<number | null>(null),
    is_all_district: new FormControl('Y'),
    is_all_block: new FormControl('Y'),
    is_all_panchayat: new FormControl('Y')
  });

  ngOnInit(): void {
    this.currentUserId = this.fbService.getCurrentUserId();
    const role = (this.fbService.getCurrentUserRole() || '').toUpperCase();

    if (role === 'CKR' || role === 'CHECKER') {
      this.accessDenied = true;
      this.accessDeniedMessage = 'Permission Denied: Checkers (CKR) are not permitted to create or modify campaigns. Campaign review is handled from the Campaign Verification Queue.';
      this.cdr.detectChanges();
      return;
    }

    if (role === 'APR' || role === 'APPROVER') {
      this.accessDenied = true;
      this.accessDeniedMessage = 'Permission Denied: Approvers (APR) are not permitted to create or modify campaigns. Campaign approvals are handled from the Approver Review Queue.';
      this.cdr.detectChanges();
      return;
    }

    this.ensureClientAesKey();

    this.loadPortals();
    this.loadDistricts();
    this.loadExistingNotices();

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        this.campaignId = Number(idParam);
        this.isEditMode = true;
        this.loadCampaignForEdit(this.campaignId);
      } else {
        this.campaignId = null;
        this.isEditMode = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  /**
   * Loads the list of portals backed by dbo.mst_portal.
   * Multi-tier fallback guarantees data binds:
   * 1. MessageCampaign/GetPortals (direct mst_portal)
   * 2. Portal/GetPortals (portal controller)
   * 3. Group/List (group management backed by mst_portal)
   */
  loadPortals(): void {
    this.portalsLoading = true;

    this.fbService.getPortals().subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (list && list.length > 0) {
          this.applyPortalsList(list);
        } else {
          this.loadPortalsFallback();
        }
      },
      error: () => {
        this.loadPortalsFallback();
      }
    });
  }

  private loadPortalsFallback(): void {
    this.portalService.getPortals().subscribe({
      next: (res: any) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (list && list.length > 0) {
          this.applyPortalsList(list);
        } else {
          this.loadPortalsFromGroupService();
        }
      },
      error: () => {
        this.loadPortalsFromGroupService();
      }
    });
  }

  private loadPortalsFromGroupService(): void {
    this.groupService.getGroupManagement().subscribe({
      next: (res) => {
        this.portalsLoading = false;
        const groups = res?.data?.groups || [];
        if (groups && groups.length > 0) {
          this.applyPortalsList(groups);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.portalsLoading = false;
        console.error('All portal endpoints failed:', err);
        this.cdr.detectChanges();
      }
    });
  }

  private applyPortalsList(list: any[]): void {
    this.portalsLoading = false;
    this.portals = list.map((p: any) => ({
      portal_id: Number(p.portal_id ?? p.PortalId ?? 0),
      portal_name: this.decrypt(p.portal_name ?? p.PortalName ?? `Portal ${p.portal_id ?? p.PortalId}`)
    })).filter((p: NormalizedPortal) => p.portal_id > 0);
    this.cdr.detectChanges();
  }

  /**
   * Loads the list of districts backed by dbo.Districts.
   * Uses DistrictService (standard in project with RSA key exchange and AES decryption)
   * with fallback to MessageCampaign/GetDistricts.
   */
  loadDistricts(): void {
    this.districtsLoading = true;
    this.ensureClientAesKey();

    // Strategy 1: DistrictService (standard in project)
    this.districtService.getDistrictList().subscribe({
      next: (res: any) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        if (list && list.length > 0) {
          this.applyDistrictsList(list);
        } else {
          this.loadDistrictsFallback();
        }
      },
      error: () => {
        this.loadDistrictsFallback();
      }
    });
  }

  private loadDistrictsFallback(): void {
    // Strategy 2: fbService.getDistricts (/api/MessageCampaign/GetDistricts)
    this.fbService.getDistricts().subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.applyDistrictsList(list);
      },
      error: (err) => {
        this.districtsLoading = false;
        console.error('Failed to load districts:', err);
        this.cdr.detectChanges();
      }
    });
  }

  private applyDistrictsList(list: any[]): void {
    this.districtsLoading = false;
    this.districts = list.map((d: any) => {
      const rawCode = d.dist_code ?? d.DistCode ?? d.distCode ?? d.District_Code ?? d.district_Code ?? d.district_code ?? '';
      const decryptedCode = this.decrypt(rawCode);
      const numCode = Number(decryptedCode) || Number(rawCode) || 0;

      const rawName = d.dist_name ?? d.DistrictName ?? d.districtName ?? d.District_Name ?? d.district_Name ?? d.district_name ?? '';
      const decryptedName = this.decrypt(rawName) || String(rawName);

      return {
        dist_code: numCode,
        dist_name: decryptedName
      };
    }).filter((d: NormalizedDistrict) => d.dist_code > 0 && d.dist_name.trim().length > 0);

    // Sort alphabetically by district name
    this.districts.sort((a, b) => a.dist_name.localeCompare(b.dist_name, undefined, { sensitivity: 'base' }));
    this.cdr.detectChanges();
  }

  loadExistingNotices(): void {
    this.fbService.getExistingBroadcastMessages().subscribe({
      next: (res) => {
        this.existingNotices = res?.data || (Array.isArray(res) ? res : []);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load existing notices:', err)
    });
  }

  setMessageSourceMode(mode: 'existing' | 'new'): void {
    this.messageSourceMode = mode;
    if (mode === 'new') {
      this.campaignForm.patchValue({ bmsg_id: null });
      this.selectedNoticeDetails = null;
    }
  }

  onScopeChange(): void {
    const scope = this.campaignForm.get('target_scope')?.value;
    if (scope === 'ALL') {
      this.campaignForm.patchValue({ portal_id: null, user_type_id: null });
      this.userTypes = [];
    } else if (scope === 'PORTAL' || scope === 'USER_TYPE') {
      if (this.portals.length === 0) {
        this.loadPortals();
      }
      if (scope === 'PORTAL') {
        this.campaignForm.patchValue({ user_type_id: null });
        this.userTypes = [];
      }
    } else if (scope === 'LOCATION') {
      this.campaignForm.patchValue({ portal_id: null, user_type_id: null });
      this.userTypes = [];
      if (this.districts.length === 0) {
        this.loadDistricts();
      }
    }
    this.estimateReach();
  }

  onPortalChange(): void {
    const portalId = this.campaignForm.get('portal_id')?.value;
    this.userTypes = [];
    this.campaignForm.patchValue({ user_type_id: null });

    if (portalId) {
      this.userTypesLoading = true;
      this.fbService.getUserTypes(Number(portalId)).subscribe({
        next: (res) => {
          this.userTypesLoading = false;
          const list = res?.data || (Array.isArray(res) ? res : []);
          if (list && list.length > 0) {
            this.applyUserTypesList(list);
          } else {
            this.loadUserTypesFallback(Number(portalId));
          }
        },
        error: () => {
          this.loadUserTypesFallback(Number(portalId));
        }
      });
    }
    this.estimateReach();
  }

  private loadUserTypesFallback(portalId: number): void {
    this.portalService.getUserType(portalId).subscribe({
      next: (res: any) => {
        this.userTypesLoading = false;
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.applyUserTypesList(list);
      },
      error: (err) => {
        this.userTypesLoading = false;
        console.error('Failed to load user types:', err);
        this.cdr.detectChanges();
      }
    });
  }

  private applyUserTypesList(list: any[]): void {
    this.userTypes = list.map((ut: any) => ({
      user_type_id: Number(ut.user_type_id ?? ut.User_Type_ID ?? ut.user_Type_ID ?? ut.UserType_id ?? 0),
      user_type_name: this.decrypt(ut.user_type_name ?? ut.User_Type_Name ?? ut.user_Type_Name ?? ut.UserType_name ?? '')
    })).filter((ut: NormalizedUserType) => ut.user_type_id > 0);
    this.cdr.detectChanges();
  }

  onDistrictChange(): void {
    this.blocks = [];
    this.selectedBlockCode = null;

    if (this.selectedDistrictCode) {
      this.blocksLoading = true;
      this.ensureClientAesKey();

      // Strategy 1: BlockService (standard in project with AES encryption/decryption)
      this.blockService.getBlockList(this.selectedDistrictCode.toString()).subscribe({
        next: (res: any) => {
          const list = res?.data || (Array.isArray(res) ? res : []);
          if (list && list.length > 0) {
            this.applyBlocksList(list);
          } else {
            this.loadBlocksFallback(this.selectedDistrictCode!.toString());
          }
        },
        error: () => {
          this.loadBlocksFallback(this.selectedDistrictCode!.toString());
        }
      });
    }
  }

  private loadBlocksFallback(distCode: string): void {
    this.fbService.getBlocks(distCode).subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.applyBlocksList(list);
      },
      error: (err) => {
        this.blocksLoading = false;
        console.error('Failed to load blocks:', err);
        this.cdr.detectChanges();
      }
    });
  }

  private applyBlocksList(list: any[]): void {
    this.blocksLoading = false;
    this.blocks = list.map((b: any) => {
      const rawCode = b.block_code ?? b.BlockCode ?? b.blockCode ?? '';
      const decryptedCode = this.decrypt(rawCode);
      const numCode = Number(decryptedCode) || Number(rawCode) || 0;

      const rawName = b.block_name ?? b.BlockName ?? b.blockName ?? '';
      const decryptedName = this.decrypt(rawName) || String(rawName);

      return {
        block_code: numCode,
        block_name: decryptedName
      };
    }).filter((b: NormalizedBlock) => b.block_code > 0 && b.block_name.trim().length > 0);

    // Sort alphabetically by block name
    this.blocks.sort((a, b) => a.block_name.localeCompare(b.block_name, undefined, { sensitivity: 'base' }));
    this.cdr.detectChanges();
  }

  addLocation(): void {
    if (!this.selectedDistrictCode) {
      alert('Please select at least a District to add.');
      return;
    }

    const distObj = this.districts.find((d) => Number(d.dist_code) === Number(this.selectedDistrictCode));
    const blockObj = this.blocks.find((b) => Number(b.block_code) === Number(this.selectedBlockCode));

    const loc: CampaignLocation = {
      district_code: Number(this.selectedDistrictCode),
      district_name: distObj?.dist_name || `District ${this.selectedDistrictCode}`,
      block_code: this.selectedBlockCode ? Number(this.selectedBlockCode) : null,
      block_name: blockObj?.block_name || null
    };

    // Check duplicate
    const exists = this.targetLocations.some(
      (l) => l.district_code === loc.district_code && l.block_code === loc.block_code
    );
    if (exists) {
      alert('This location has already been added to the target list.');
      return;
    }

    this.targetLocations.push(loc);
    this.campaignForm.patchValue({ is_all_district: 'N' });
    this.estimateReach();
  }

  removeLocation(index: number): void {
    this.targetLocations.splice(index, 1);
    if (this.targetLocations.length === 0) {
      this.campaignForm.patchValue({ is_all_district: 'Y' });
    }
    this.estimateReach();
  }

  onExistingNoticeSelect(noticeId?: number | null): void {
    if (!noticeId) {
      this.selectedNoticeDetails = null;
      return;
    }

    const selected = this.existingNotices.find((n) => Number(n.bmsg_id) === Number(noticeId));
    if (selected) {
      this.selectedNoticeDetails = selected;
      this.campaignForm.patchValue({
        bmsg_id: selected.bmsg_id,
        message_head: selected.message_head,
        message_body: selected.message_body,
        photo1path: selected.photo1path,
        photo2path: selected.photo2path,
        videopath: selected.videopath,
        documentpath: selected.documentpath
      });
    }
  }

  estimateReach(): void {
    this.isEstimating = true;
    const formVals = this.campaignForm.value;

    const payload = {
      targetScope: formVals.target_scope || 'ALL',
      portalId: formVals.portal_id ? Number(formVals.portal_id) : null,
      userTypeId: formVals.user_type_id ? Number(formVals.user_type_id) : null,
      isAllDistrict: this.targetLocations.length > 0 ? 'N' : (formVals.is_all_district || 'Y'),
      isAllBlock: 'Y',
      isAllPanchayat: 'Y',
      locations: this.targetLocations
    };

    this.fbService.estimateRecipients(payload).subscribe({
      next: (res) => {
        this.isEstimating = false;
        if (res?.status) {
          this.estimatedReach = res.data;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isEstimating = false;
        console.warn('Recipients estimation notice:', err);
        this.cdr.detectChanges();
      }
    });
  }

  loadCampaignForEdit(id: number): void {
    this.isLoading = true;
    this.fbService.getCampaignById(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.status && res.data) {
          const c = res.data;
          this.loadedCampaign = c;
          this.campaignForm.patchValue({
            campaign_name: c.campaign_name,
            campaign_description: c.campaign_description,
            bmsg_id: c.bmsg_id,
            start_date: this.formatForDateInput(c.start_date),
            end_date: this.formatForDateInput(c.end_date),
            scheduled_send_time: this.formatForDateTimeLocal(c.scheduled_send_time),
            target_scope: c.target_scope,
            portal_id: c.portal_id ? Number(c.portal_id) : null,
            user_type_id: c.user_type_id ? Number(c.user_type_id) : null,
            is_all_district: c.is_all_district,
            is_all_block: c.is_all_block,
            is_all_panchayat: c.is_all_panchayat,
            message_head: c.message_head || c.broadcast_message?.message_head,
            message_body: c.message_body || c.broadcast_message?.message_body,
            photo1path: c.photo1path || c.broadcast_message?.photo1path,
            photo2path: c.photo2path || c.broadcast_message?.photo2path,
            videopath: c.videopath || c.broadcast_message?.videopath,
            documentpath: c.documentpath || c.broadcast_message?.documentpath
          });

          if (c.target_locations && c.target_locations.length > 0) {
            this.targetLocations = [...c.target_locations];
          }

          if (c.portal_id) {
            this.fbService.getUserTypes(Number(c.portal_id)).subscribe({
              next: (utRes) => {
                const list = utRes?.data || (Array.isArray(utRes) ? utRes : []);
                this.applyUserTypesList(list);
                this.campaignForm.patchValue({ user_type_id: c.user_type_id ? Number(c.user_type_id) : null });
              }
            });
          }

          this.messageSourceMode = 'existing';
          this.estimateReach();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.showError('Unable to load campaign details: ' + (err.error?.message || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  saveCampaign(submitForVerification: boolean): void {
    if (this.campaignForm.invalid) {
      this.campaignForm.markAllAsTouched();
      const invalidFields: string[] = [];
      Object.keys(this.campaignForm.controls).forEach((key) => {
        const ctrl = this.campaignForm.get(key);
        if (ctrl && ctrl.invalid) {
          invalidFields.push(key.replace(/_/g, ' '));
        }
      });
      const fieldList = invalidFields.length > 0 ? ` Required fields: ${invalidFields.join(', ')}.` : '';
      this.showError(`Please complete all required fields.${fieldList}`);
      return;
    }

    const formVals = this.campaignForm.value;

    // Validate message requirements
    if (this.messageSourceMode === 'existing' && !formVals.bmsg_id) {
      this.showError('Please select an existing broadcast message to associate with this campaign.');
      return;
    }

    if (this.messageSourceMode === 'new' && !formVals.message_head?.trim() && !formVals.message_body?.trim()) {
      this.showError('Please provide a message title or message body for the campaign notice.');
      return;
    }

    // Target scope validations
    if (formVals.target_scope === 'PORTAL' && !formVals.portal_id) {
      this.showError('Please select a Target Portal for this campaign.');
      return;
    }

    if (formVals.target_scope === 'USER_TYPE') {
      if (!formVals.portal_id) {
        this.showError('Please select a Target Portal for this campaign.');
        return;
      }
      if (!formVals.user_type_id) {
        this.showError('Please select a Target User Type for this campaign.');
        return;
      }
    }

    if (formVals.target_scope === 'LOCATION' && this.targetLocations.length === 0) {
      this.showError('Please add at least one District or Block to the Target Locations list.');
      return;
    }

    // Date validations
    if (formVals.start_date && formVals.end_date) {
      const s = new Date(formVals.start_date);
      const e = new Date(formVals.end_date);
      if (e < s) {
        this.showError('Campaign End Date must be greater than or equal to Start Date.');
        return;
      }
    }

    if (formVals.scheduled_send_time) {
      const sched = new Date(formVals.scheduled_send_time);
      const now = new Date();
      if (sched.getTime() < now.getTime() - 5 * 60 * 1000) {
        this.showError('Scheduled send time cannot be in the past.');
        return;
      }
    }

    this.isSaving = true;

    if (this.isEditMode && this.campaignId) {
      // Update Campaign
      const updateReq: UpdateCampaignRequest = {
        campaign_name: formVals.campaign_name!.trim(),
        campaign_description: formVals.campaign_description?.trim() || undefined,
        bmsg_id: formVals.bmsg_id ? Number(formVals.bmsg_id) : undefined,
        start_date: this.toIsoOrUndefined(formVals.start_date),
        end_date: this.toIsoOrUndefined(formVals.end_date),
        scheduled_send_time: this.toIsoOrUndefined(formVals.scheduled_send_time),
        target_scope: formVals.target_scope || 'ALL',
        portal_id: formVals.portal_id ? Number(formVals.portal_id) : null,
        user_type_id: formVals.user_type_id ? Number(formVals.user_type_id) : null,
        is_all_district: this.targetLocations.length > 0 ? 'N' : (formVals.is_all_district || 'Y'),
        is_all_block: formVals.is_all_block || 'Y',
        is_all_panchayat: formVals.is_all_panchayat || 'Y',
        target_locations: this.targetLocations,
        submit_for_verification: submitForVerification,
        updated_by: this.currentUserId
      };

      this.fbService.updateCampaign(this.campaignId, updateReq).subscribe({
        next: (res) => {
          this.isSaving = false;
          alert(res.message || 'Campaign updated successfully.');
          this.router.navigate(['/campaigns']);
        },
        error: (err) => {
          this.isSaving = false;
          const msg = err.error?.message || (typeof err.error === 'string' ? err.error : null) || err.message || 'Failed to update campaign.';
          console.error('Update campaign error:', err);
          this.showError(msg);
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create Campaign
      const newBroadcast = this.messageSourceMode === 'new'
        ? {
            message_head: formVals.message_head?.trim() || formVals.campaign_name!.trim(),
            message_body: formVals.message_body?.trim() || '',
            validity_in_minutes: formVals.validity_in_minutes ? Number(formVals.validity_in_minutes) : 1440,
            photo1path: formVals.photo1path?.trim() || undefined,
            photo2path: formVals.photo2path?.trim() || undefined,
            videopath: formVals.videopath?.trim() || undefined,
            documentpath: formVals.documentpath?.trim() || undefined
          }
        : undefined;

      const createReq: CreateCampaignRequest = {
        campaign_name: formVals.campaign_name!.trim(),
        campaign_description: formVals.campaign_description?.trim() || undefined,
        bmsg_id: this.messageSourceMode === 'existing' && formVals.bmsg_id ? Number(formVals.bmsg_id) : null,
        new_broadcast_message: newBroadcast,
        message_details: newBroadcast,
        start_date: this.toIsoOrUndefined(formVals.start_date),
        end_date: this.toIsoOrUndefined(formVals.end_date),
        scheduled_send_time: this.toIsoOrUndefined(formVals.scheduled_send_time),
        target_scope: formVals.target_scope || 'ALL',
        portal_id: formVals.portal_id ? Number(formVals.portal_id) : null,
        user_type_id: formVals.user_type_id ? Number(formVals.user_type_id) : null,
        is_all_district: this.targetLocations.length > 0 ? 'N' : (formVals.is_all_district || 'Y'),
        is_all_block: formVals.is_all_block || 'Y',
        is_all_panchayat: formVals.is_all_panchayat || 'Y',
        target_locations: this.targetLocations,
        submit_for_verification: submitForVerification,
        created_by: this.currentUserId
      };

      console.log('Sending CreateCampaignRequest:', createReq);

      this.fbService.createCampaign(createReq).subscribe({
        next: (res) => {
          this.isSaving = false;
          alert(res.message || 'Campaign created successfully.');
          this.router.navigate(['/campaigns']);
        },
        error: (err) => {
          this.isSaving = false;
          const msg = err.error?.message || (typeof err.error === 'string' ? err.error : null) || err.message || 'Failed to create campaign.';
          console.error('Create campaign error:', err);
          this.showError(msg);
          this.cdr.detectChanges();
        }
      });
    }
  }

  showError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
    this.cdr.detectChanges();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 9000);
  }

  private ensureClientAesKey(): string {
    let clientAES = localStorage.getItem('clientAES') || '';
    if (!clientAES) {
      clientAES = this.cryptoService.generateAESKey();
      localStorage.setItem('clientAES', clientAES);
    }
    return clientAES;
  }

  private decrypt(value: any): string {
    if (!value) return '';
    try {
      const clientAES = this.ensureClientAesKey();
      if (clientAES) {
        const decrypted = this.cryptoService.decryptAES(String(value), clientAES);
        if (decrypted) return decrypted;
      }
      return String(value);
    } catch {
      return String(value);
    }
  }

  private formatForDateInput(dateVal: string | null | undefined): string {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().substring(0, 10);
    } catch {
      return '';
    }
  }

  private formatForDateTimeLocal(dateVal: string | null | undefined): string {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  }

  private toIsoOrUndefined(dateStr: string | null | undefined): string | undefined {
    if (!dateStr || !dateStr.trim()) return undefined;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
}
