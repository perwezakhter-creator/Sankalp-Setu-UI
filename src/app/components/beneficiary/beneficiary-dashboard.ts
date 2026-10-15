import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { BeneficiaryProfile } from '../../models/otp';
import { MasterService } from '../../services/master';
import { DistrictService } from '../../services/district';
import { BlockService } from '../../services/block';
import { CryptoService } from '../../services/crypto.service';
import { MessageService } from '../../services/message.service';
import { PortalService } from '../../services/portal';
import { BroadcastMessageData } from '../../models/broadcast-message';
import { InterestWiseMessageData } from '../../models/interest-message';
import { Portal } from '../../models/portal';
import { PortalUserModal } from '../portal-user-modal/portal-user-modal';

@Component({
  selector: 'app-beneficiary',
  standalone: true,
  imports: [CommonModule, PortalUserModal],
  templateUrl: './beneficiary-dashboard.html',
  styleUrl: './beneficiary-dashboard.css'
})
export class BeneficiaryComponent implements OnInit {

  profile: BeneficiaryProfile | null = null;

  collapsed = false;

  selectedMenu: string = 'dashboard';

  broadcastList: BroadcastMessageData[] = [];

  broadcastLoading = false;

  selectedBroadcastMsg: BroadcastMessageData | null = null;
  selectedBroadcastThemeIndex: number = 0;

  activeInterest: { interestId: number; interestName: string } | null = null;
  showAllInterests: boolean = false;
  interestMessages: InterestWiseMessageData[] = [];
  interestLoading: boolean = false;
  interestError: string = '';
  selectedInterestMsg: any | null = null;

  genders: { code: string; name: string }[] = [];
  ageGroups: { code: string; name: string }[] = [];
  categories: { code: string; name: string }[] = [];
  qualifications: { code: string; name: string }[] = [];
  occupations: { code: string; name: string }[] = [];
  districts: { code: string; name: string }[] = [];
  blocks: { code: string; name: string }[] = [];

  portals: Portal[] = [];
  portalLoading = false;

  portalDropdownOpen = false;
  isPortalUserModalOpen = false;
  selectedPortal: Portal | null = null;

  get selectedPortalLabel(): string {
    return this.selectedPortal ? this.selectedPortal.portalName : 'Select Portal';
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    private masterService: MasterService,
    private districtService: DistrictService,
    private blockService: BlockService,
    private cryptoService: CryptoService,
    private messageService: MessageService,
    private portalService: PortalService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    const savedProfile = localStorage.getItem('beneficiaryProfile');
    if (!savedProfile) {
      return;
    }

    try {
      this.profile = JSON.parse(savedProfile) as BeneficiaryProfile;
      this.loadMasterData();
    } catch {
      localStorage.removeItem('beneficiaryProfile');
    }
  }

  private loadMasterData(): void {
    if (!localStorage.getItem('clientAES')) {
      return;
    }

    this.masterService.getGenderList().subscribe({
      next: (res: any) => {
        if (res?.status && Array.isArray(res.data)) {
          this.genders = this.mapList(res.data,
            ['gender_code', 'gender_Code', 'genderCode', 'GenderCode'],
            ['gender_name', 'gender_Name', 'genderName', 'GenderName']);
        }
        this.refreshView();
      },
      error: (err) => {
        console.error('Failed to load genders', err);
        this.refreshView();
      },
    });

    this.masterService.getAgeGroupList().subscribe({
      next: (res: any) => {
        if (res?.status && Array.isArray(res.data)) {
          this.ageGroups = this.mapList(res.data,
            ['id', 'age_group_id', 'ageGroupId', 'age_Group_Id'],
            ['age_group_name', 'ageGroupName', 'ageGroup_Name']);
        }
        this.refreshView();
      },
      error: (err) => {
        console.error('Failed to load age groups', err);
        this.refreshView();
      },
    });

    this.masterService.getCategoryList().subscribe({
      next: (res: any) => {
        if (res?.status && Array.isArray(res.data)) {
          this.categories = this.mapList(res.data,
            ['category_id', 'category_Id', 'categoryId', 'categoryid', 'CategoryID', 'CategoryId'],
            ['category_name', 'category_Name', 'categoryName', 'categoryname', 'CategoryName', 'category']);
        }
        this.refreshView();
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.refreshView();
      },
    });

    this.masterService.getQualificationList().subscribe({
      next: (res: any) => {
        if (res?.status && Array.isArray(res.data)) {
          this.qualifications = this.mapList(res.data,
            ['qualification_id', 'qualification_Id', 'qualificationId', 'QualificationID'],
            ['qualification_name', 'qualification_Name', 'qualificationName']);
        }
        this.refreshView();
      },
      error: (err) => {
        console.error('Failed to load qualifications', err);
        this.refreshView();
      },
    });

    this.masterService.getOccupationList().subscribe({
      next: (res: any) => {
        if (res?.status && Array.isArray(res.data)) {
          this.occupations = this.mapList(res.data,
            ['occupation_id', 'occupation_Id', 'occupationId', 'OccupationID'],
            ['occupation_name', 'occupation_Name', 'occupationName']);
        }
        this.refreshView();
      },
      error: (err) => {
        console.error('Failed to load occupations', err);
        this.refreshView();
      },
    });

    this.districtService.getDistrictList().subscribe({
      next: (res: any) => {
        if (res?.status && Array.isArray(res.data)) {
          this.districts = this.mapList(res.data,
            ['district_code', 'District_Code', 'district_Code', 'districtcode', 'distCode', 'districtCode'],
            ['district_name', 'District_Name', 'district_Name', 'districtname', 'distName', 'districtName']);
        }
        this.refreshView();
      },
      error: (err) => {
        console.error('Failed to load districts', err);
        this.refreshView();
      },
    });

    if (this.profile?.distCode) {
      this.blockService.getBlockList(String(this.profile.distCode)).subscribe({
        next: (res: any) => {
          if (res?.status && Array.isArray(res.data)) {
            this.blocks = this.mapList(res.data,
              ['blockcode', 'BlockCode', 'blockCode', 'block_Code'],
              ['blockname', 'BlockName', 'blockName', 'block_Name']);
          }
          this.refreshView();
        },
        error: (err) => {
          console.error('Failed to load blocks', err);
          this.refreshView();
        },
      });
    }
  }

  private mapList(data: any[], codeKeys: string[], nameKeys: string[]): { code: string; name: string }[] {
    return data.map((item: any) => ({
      code: this.decrypt(this.firstValue(item, codeKeys)),
      name: this.decrypt(this.firstValue(item, nameKeys)),
    }));
  }

  private firstValue(obj: any, keys: string[]): string {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null && v !== '') {
        return v;
      }
    }
    return '';
  }

  private decrypt(value: string): string {
    if (!value) return '';
    const clientAES = localStorage.getItem('clientAES') || '';
    try {
      const decrypted = this.cryptoService.decryptAES(String(value), clientAES);
      return decrypted || String(value);
    } catch {
      return String(value);
    }
  }

  private refreshView(): void {
    this.cdr.detectChanges();
  }


  private resolve(list: { code: string; name: string }[], code: number | string | null | undefined): string {
    if (code === undefined || code === null || code === '') {
      return '—';
    }
   
    const found = list.find((i) => String(i.code) === String(code));
    return found ? found.name : String(code);
  }

  get displayName(): string {
    return this.profile?.name || 'Beneficiary';
  }

  get displayEmail(): string {
    return this.profile?.email || 'beneficiary@sankalpsetu.gov.in';
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
  }

 
  selectMenu(menu: string): void {
    this.selectedMenu = menu;
    if (menu === 'broadcast') {
      this.loadBroadcastMessages();
    } else if (menu === 'portal') {
      this.loadPortals();
    } else if (menu === 'interest') {
      // Auto-select "All Interests" whenever the interest-wise message view
      // is opened so all messages are shown at once.
      this.openAllInterests();
    }
  }

  loadPortals(): void {
    if (this.portals.length) {
      this.refreshView();
      return;
    }
    this.portalLoading = true;
    this.portalService.getPortalList().subscribe({
      next: (res: any) => {
        this.portalLoading = false;
        if (res && res.status && Array.isArray(res.data)) {
          this.portals = res.data.map((item: any) => ({
            portalId: item.portal_id,
            portalName: this.decrypt(item.portal_name),
            portalUrl: this.decrypt(item.portal_url),
            portalImagePath: this.decrypt(item.portal_image_path),
            isActive: this.isActiveFlag(item.is_active)
          }));
        } else {
          this.portals = [];
        }
        this.refreshView();
      },
      error: (err) => {
        this.portalLoading = false;
        console.error('Failed to load portals', err);
        this.portals = [];
        this.refreshView();
      },
    });
  }

  private isActiveFlag(value: string): boolean {
    const raw = this.decrypt(value).toUpperCase();
    return raw === 'Y' || raw === 'ACTIVE' || raw === 'TRUE' || raw === '1';
  }

  getInitials(name: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getPortalAvatarColor(name: string): string {
    const colors = [
      '#0b7a6b', '#0e7490', '#b45309', '#7e22ce', '#be185d', '#15803d', '#1d4ed8'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  portalDisplayUrl(url: string): string {
    if (!url) return '';
    return url.startsWith('http') ? url : 'https://' + url;
  }


  get userInterestOptions(): { interestId: number; interestName: string }[] {
    if (!this.profile) {
      return [];
    }
    const userInterests = this.profile.userInterests;
    if (userInterests && userInterests.length) {
      return userInterests.map((i) => ({
        interestId: Number(i.interestId),
        interestName: i.interestName || `Interest #${i.interestId}`
      }));
    }
    if (this.profile.interests && this.profile.interests.length) {
      return this.profile.interests.map((id) => ({
        interestId: Number(id),
        interestName: `Interest #${id}`
      }));
    }
    return [];
  }

  openInterest(interest: { interestId: number; interestName: string } | null): void {debugger
    if (!interest) {
      return;
    }
    this.showAllInterests = false;
    this.activeInterest = interest;
    this.interestMessages = [];
    this.interestError = '';
    this.interestLoading = true;

    // This list endpoint is repeatable. The device-specific endpoint returns
    // only a message delivery and can therefore be empty after the first read.
    this.messageService.getInterestWiseMessages(interest.interestId).subscribe({
      next: (res: any) => {
        this.interestLoading = false;
        this.interestMessages = this.extractInterestMessages(res);
        this.refreshView();
      },
      error: (err) => {
        this.interestLoading = false;
        this.interestError =
          err?.error?.message || 'Failed to load interest-wise messages.';
        this.refreshView();
      },
    });
  }

  openAllInterests(): void {
    const interests = this.userInterestOptions;
    if (!interests.length) {
      return;
    }

    this.activeInterest = null;
    this.showAllInterests = true;
    this.interestMessages = [];
    this.interestError = '';
    this.interestLoading = true;

    const requests = interests.map((interest) =>
      this.messageService.getInterestWiseMessages(interest.interestId)
    );

    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        this.interestLoading = false;
        const merged: any[] = [];
        results.forEach((res, index) => {
          const interest = interests[index];
          const messages = this.extractInterestMessages(res);
          messages.forEach((msg: any) => {
            merged.push({
              ...msg,
              interest_id: msg?.interest_id ?? interest.interestId,
              interest_name: msg?.interest_name || interest.interestName
            });
          });
        });
        this.interestMessages = merged;
        this.refreshView();
      },
      error: (err) => {
        this.interestLoading = false;
        this.interestError =
          err?.error?.message || 'Failed to load interest-wise messages.';
        this.refreshView();
      },
    });
  }

  private extractInterestMessages(res: any): InterestWiseMessageData[] {
    if (!res) {
      return [];
    }
    const direct: any = Array.isArray(res) ? res : null;
    const data = direct ?? (res.data !== undefined ? res.data : null);
    if (Array.isArray(data)) {
      return data as InterestWiseMessageData[];
    }
    if (data && Array.isArray(data.data)) {
      return data.data as InterestWiseMessageData[];
    }
    if (data && Array.isArray(data.list)) {
      return data.list as InterestWiseMessageData[];
    }
    return [];
  }

  resolveMessageHead(msg: any): string {
    return msg?.message_head || msg?.messageHead || msg?.title || 'Interest Message';
  }

  resolveMessageBody(msg: any): string {
    return msg?.message_body || msg?.messageBody || msg?.body || msg?.message || '';
  }

  resolveIsActive(msg: any): boolean {
    const val = msg?.is_active;
    return val === undefined || val === null ? true : String(val).toUpperCase() === 'Y';
  }

  resolveValidity(msg: any): string {
    const minutes = msg?.validity_in_minutes || msg?.validityMinutes;
    return minutes ? `${minutes} mins` : 'Standard';
  }

  resolveEntryDate(msg: any): string {
    return msg?.entrydate || msg?.entryDate || msg?.publishedOn || '—';
  }

 
  openInterestModal(msg: any): void {
    this.selectedInterestMsg = msg;
    this.refreshView();
  }

  closeInterestModal(): void {
    this.selectedInterestMsg = null;
    this.refreshView();
  }

 
  loadBroadcastMessages(): void {
    this.broadcastLoading = true;
    const deviceId = this.profile?.deviceId || localStorage.getItem('deviceId') || '';
    this.messageService.getBroadcastMessages(deviceId).subscribe({
      next: (res: any) => {
        this.broadcastLoading = false;
        if (res && res.status && Array.isArray(res.data)) {
          this.broadcastList = res.data;
        } else {
          this.broadcastList = [];
        }
        this.refreshView();
      },
      error: (err) => {
        this.broadcastLoading = false;
        console.error('Failed to load broadcast messages', err);
        this.refreshView();
      },
    });
  }

  openBroadcastModal(msg: BroadcastMessageData, index: number): void {
    this.selectedBroadcastMsg = msg;
    this.selectedBroadcastThemeIndex = index % 9;
    this.refreshView();
  }

  closeBroadcastModal(): void {
    this.selectedBroadcastMsg = null;
    this.refreshView();
  }

  getBroadcastThemeClass(index: number): string {
    const themes = [
      'theme-yellow',
      'theme-orange',
      'theme-brown',
      'theme-green',
      'theme-cyan',
      'theme-blue',
      'theme-slate',
      'theme-purple',
      'theme-pink'
    ];
    return themes[index % themes.length];
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.selectedInterestMsg) {
      this.closeInterestModal();
    } else if (this.selectedBroadcastMsg) {
      this.closeBroadcastModal();
    }
  }


  onMenuClick(): void {
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }


  get genderLabel(): string {
    return this.resolve(this.genders, this.profile?.genderCode);
  }

  get ageGroupLabel(): string {
    return this.resolve(this.ageGroups, this.profile?.ageGroupId);
  }

  get categoryLabel(): string {
    return this.resolve(this.categories, this.profile?.categoryId);
  }

  get qualificationLabel(): string {
    return this.resolve(this.qualifications, this.profile?.qualificationId);
  }

  get occupationLabel(): string {
    return this.resolve(this.occupations, this.profile?.occupationId);
  }

  get districtLabel(): string {
    return this.resolve(this.districts, this.profile?.distCode);
  }

  get blockLabel(): string {
    return this.resolve(this.blocks, this.profile?.blockCode);
  }

  get areaTypeLabel(): string {
    const t = this.profile?.areaType || '';
    if (t === 'R' || t === 'Rural' || t === 'rural') return 'Rural';
    if (t === 'U' || t === 'Urban' || t === 'urban') return 'Urban';
    return t || '—';
  }

  // --------------------------------------------------
  // Portal dropdown (toolbar) + portal-user modal
  // --------------------------------------------------
  togglePortalDropdown(): void {
    this.portalDropdownOpen = !this.portalDropdownOpen;
  }

  selectPortal(portal: Portal): void {
    this.portalDropdownOpen = false;
    this.selectedPortal = portal;
    this.isPortalUserModalOpen = true;
  }

  closePortalUserModal(): void {
    this.isPortalUserModalOpen = false;
    this.refreshView();
  }

  onPortalUserSaved(payload: any): void {
    console.log('Portal user payload:', payload);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      this.portalDropdownOpen &&
      this.elementRef.nativeElement &&
      !this.elementRef.nativeElement.contains(event.target as Node)
    ) {
      this.portalDropdownOpen = false;
    }
  }

}
