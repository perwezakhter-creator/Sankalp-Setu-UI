import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  ChangeDetectorRef,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';

import { Portal } from '../../models/portal';
import { PortalService } from '../../services/portal';
import { CryptoService } from '../../services/crypto.service';

export interface PortalUserType {
  portalId: number | string;
  userTypeId: string;
  userTypeName: string;
  userTypeNameHn: string;
}

@Component({
  selector: 'app-portal-user-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './portal-user-modal.html',
  styleUrl: './portal-user-modal.css',
})
export class PortalUserModal implements OnChanges {

  private portalService = inject(PortalService);
  private cryptoService = inject(CryptoService);
  private host = inject(ElementRef<HTMLElement>);
  private cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Input() portal: Portal | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  portalId: number | null = null;
  deviceId = '';

  userTypes: PortalUserType[] = [];
  userTypesLoading = false;
  userTypesError = '';
  userTypeDropdownOpen = false;

  loading = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';

  step: 'form' | 'otp' | 'success' | 'messages' = 'form';
  fetchedBeneficiary: any = null;
  fetchedBeneficiaries: any[] = [];
  verifiedBeneficiaries: any[] = [];
  verifiedData: any = null;
  beneficiaryStatusMode = false;
  beneficiaryIdInput = '';
  beneficiaryStatus: any = null;
  selectedBeneficiaryStatus: any = null;
  beneficiaryStatusLoading = false;
  beneficiaryStatusError = '';
  beneficiaryStatusInfo = '';
  copied = false;

  tokenInput = '';
  messages: any[] = [];
  messagesLoading = false;
  messageError = '';
  messageInfo = '';
  selectedMessage: any = null;
  selectedBeneficiary: any = null;
  selectedVerifiedBeneficiary: any = null;

  userForm = new FormGroup({
    mobileNo: new FormControl('', [
      Validators.required,
      Validators.pattern('^[0-9]{10}$'),
    ]),
    session: new FormControl(String(new Date().getFullYear()), [
      Validators.required,
      Validators.pattern('^[0-9]{4}$'),
    ]),
    userType: new FormControl('', [Validators.required]),
  });

  otpForm = new FormGroup({
    otp: new FormControl('', [
      Validators.required,
      Validators.pattern('^[0-9]{6}$'),
    ]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.reset();
      this.initFromPortal();
      this.initDeviceId();
      this.resetSessionToCurrentYear();
      this.loadUserTypes();
    }
  }

  private reset(): void {
    this.submitted = false;
    this.loading = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.userTypes = [];
    this.userTypesLoading = false;
    this.userTypesError = '';
    this.userTypeDropdownOpen = false;
    this.step = 'form';
    this.fetchedBeneficiary = null;
    this.fetchedBeneficiaries = [];
    this.verifiedBeneficiaries = [];
    this.verifiedData = null;
    this.beneficiaryStatusMode = false;
    this.beneficiaryIdInput = '';
    this.beneficiaryStatus = null;
    this.selectedBeneficiaryStatus = null;
    this.beneficiaryStatusLoading = false;
    this.beneficiaryStatusError = '';
    this.beneficiaryStatusInfo = '';
    this.copied = false;
    this.tokenInput = '';
    this.messages = [];
    this.messagesLoading = false;
    this.messageError = '';
    this.messageInfo = '';
    this.selectedMessage = null;
    this.selectedBeneficiary = null;
    this.selectedVerifiedBeneficiary = null;
    this.userForm.reset();
    this.otpForm.reset();
  }

  private initFromPortal(): void {
    this.portalId = this.portal ? this.portal.portalId : null;
  }

  private initDeviceId(): void {
    let id = localStorage.getItem('deviceId') || '';
    if (!id) {
      try {
        const p = JSON.parse(localStorage.getItem('beneficiaryProfile') || 'null');
        if (p && p.deviceId) {
          id = String(p.deviceId);
        }
      } catch {
      }
    }
    this.deviceId = id;
  }

  private resetSessionToCurrentYear(): void {
    this.userForm.patchValue({
      session: String(new Date().getFullYear()),
    } as any);
  }

  loadUserTypes(): void {
    if (!this.portalId) {
      this.userTypesError = 'No portal selected. Please choose a portal first.';
      return;
    }

    this.userTypesLoading = true;
    this.userTypesError = '';

    this.portalService.getUserType(this.portalId).subscribe({
      next: (res: any) => {
        this.userTypesLoading = false;
        if (res && Array.isArray(res.data)) {
          this.userTypes = res.data.map((item: any) => ({
            portalId: item.Portal_ID ?? item.portal_id,
            userTypeId: String(item.User_Type_ID ?? item.user_type_id ?? ''),
            userTypeName: this.decrypt(item.User_Type_Name ?? item.user_type_name ?? ''),
            userTypeNameHn: this.decrypt(item.User_Type_Name_hn ?? item.user_type_name_hn ?? ''),
          }));
        } else {
          this.userTypes = [];
          this.userTypesError = 'No user types are available for this portal.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.userTypesLoading = false;
        console.error('Failed to load portal user types', err);
        this.userTypesError = 'Failed to load user types. Please try again.';
        this.cdr.detectChanges();
      },
    });
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

  getPortalInitials(name: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  get mobileInvalid(): boolean {
    const c = this.userForm.controls.mobileNo;
    return (c.touched || this.submitted) && c.invalid;
  }

  get sessionInvalid(): boolean {
    const c = this.userForm.controls.session;
    return (c.touched || this.submitted) && c.invalid;
  }

  get beneficiaryIdInvalid(): boolean {
    const val = this.beneficiaryIdInput.trim();
    return val !== '' && !/^[0-9]+$/.test(val);
  }

  get userTypeInvalid(): boolean {
    const c = this.userForm.controls.userType;
    return (c.touched || this.submitted) && c.invalid;
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.portalId) {
      this.errorMessage = 'No portal selected. Please choose a portal first.';
      return;
    }

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.errorMessage = 'Please fill all the required fields correctly.';
      return;
    }

    const values = this.userForm.value;

    const payload = {
      portal_id: this.portalId,
      mobile_no: values.mobileNo,
      deviceid: this.deviceId,
      session: values.session,
      UserType: values.userType,
    };

    this.loading = true;

    this.portalService.sendPortalOtp(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && (res.status === true || res.status === 1 || res.success === true)) {
          const data = res.data;
          const records = (Array.isArray(data) ? data : [data]).filter(Boolean);
          if (records.length) {
            this.fetchedBeneficiaries = records;
            this.fetchedBeneficiary = records[0];
            this.otpForm.reset();
            this.step = 'otp';
            this.successMessage = 'OTP has been sent. Enter the OTP received to verify.';
          } else {
            this.errorMessage = res?.message || 'No beneficiary record found for the given details.';
          }
        } else {
          this.errorMessage = res?.message || 'Failed to send OTP. Please try again.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Send OTP error', err);
        this.errorMessage =
          err?.error?.message || err?.message || 'An error occurred while sending OTP. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  get otpInvalid(): boolean {
    const c = this.otpForm.controls.otp;
    return (c.touched || this.submitted) && c.invalid;
  }

  getBeneficiaryFields(record: any): { label: string; value: string }[] {
    const b = record;
    if (!b) return [];
    const v = (key: string): string => {
      const val = b[key];
      return val === undefined || val === null || val === '' ? '—' : String(val);
    };
    const panchayat = b['panchytName'] ? String(b['panchytName']) : v('panchyatName');
    return [
      { label: 'Beneficiary ID', value: v('beneficiaryID') },
      { label: 'Name', value: v('name') },
      { label: 'DOB', value: v('dob') },
      { label: 'Gender', value: v('gender') },
      { label: 'Mobile No', value: v('mobileNO') },
      { label: 'Category', value: v('categoryName') },
      { label: 'Scheme', value: v('schemeName') },
      { label: 'Scheme Code', value: v('schemeCode') },
      { label: 'Area', value: v('area') },
      { label: 'Village', value: v('villageName') },
      { label: 'Village Code', value: v('villageCode') },
      { label: 'Ward', value: v('wardName') },
      { label: 'Ward Code', value: v('wardCode') },
      { label: 'Panchayat', value: panchayat },
      { label: 'Panchayat Code', value: v('panchyatCode') },
      { label: 'Block', value: v('blockName') },
      { label: 'Block ID', value: v('blockId') },
      { label: 'District', value: v('districtName') },
      { label: 'District ID', value: v('districtId') },
    ];
  }

  getVerifiedFields(record: any): { label: string; value: string }[] {
    const b = record;
    if (!b) return [];
    const v = (key: string): string => {
      const val = b[key];
      return val === undefined || val === null || val === '' ? '—' : String(val);
    };
    return [
      { label: 'Aadhaar ID', value: v('a_Id') },
      { label: 'Beneficiary ID', value: v('beneficiaryID') },
      { label: 'Mobile No', value: v('mobileNo') },
      { label: 'Secret Key', value: v('secretKey') },
      { label: 'Verify Date', value: v('verifyDate') },
      { label: 'Portal ID', value: v('portal_id') },
      { label: 'User ID', value: v('user_id') },
      { label: 'Verified', value: v('is_verified') },
      { label: 'Authenticator URL', value: v('otpauth_url') },
    ];
  }


  verifyOtp(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.otpForm.invalid) {
      this.otpForm.controls.otp.markAsTouched();
      this.errorMessage = 'Please enter the 6-digit OTP received.';
      return;
    }

    const records = this.fetchedBeneficiaries && this.fetchedBeneficiaries.length
      ? this.fetchedBeneficiaries
      : (this.fetchedBeneficiary ? [this.fetchedBeneficiary] : []);

    const aIds = records
      .map((r) => r && r['a_Id'])
      .filter((id) => id !== undefined && id !== null && id !== '')
      .map(Number);

    // Portals without an external beneficiary API use the internal OTP flow.
    // Its send-OTP response intentionally has no external beneficiary a_Id.
    const isInternalOtpRegistration = !aIds.length && records.some((record) =>
      record?.otpRequired === true || record?.otp_required === true
    );

    if (!aIds.length && !isInternalOtpRegistration) {
      this.errorMessage = 'Beneficiary record reference (a_Id) is missing. Please send the OTP again.';
      return;
    }

    const payload = {
      ...(aIds.length ? { a_Id: aIds } : {}),
      mobileNo: this.userForm.controls.mobileNo.value,
      otp: this.otpForm.value.otp,
      deviceId: this.deviceId,
      session: this.userForm.controls.session.value,
      portal_id: this.portalId,
      UserType: this.userForm.controls.userType.value,
      client_key: localStorage.getItem('clientKey') || '',
      user_id: localStorage.getItem('UserId') || 'string',
    };

    this.loading = true;

    const verifyRequest = isInternalOtpRegistration
      ? this.portalService.verifyApplicantOtp(payload)
      : this.portalService.verifyOtp(payload);

    verifyRequest.subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && (res.status === true || res.status === 1 || res.success === true)) {
          const data = res.data;
          const records = (Array.isArray(data) ? data : [data]).filter(Boolean);
          this.verifiedBeneficiaries = records;
          this.verifiedData = records[0] || {};
          this.step = 'success';
        } else {
          this.errorMessage = res?.message || 'OTP verification failed. Please try again.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Verify OTP error', err);
        this.errorMessage =
          err?.error?.message || err?.message || 'An error occurred while verifying OTP. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  async copyToken(record?: any): Promise<void> {
    const token = record?.token || this.verifiedData?.token;
    if (!token) return;
    await this.copyToClipboard(token);
  }

  async copyBeneficiaryId(): Promise<void> {
    const id = this.verifiedBeneficiaries?.[0]?.beneficiaryID || this.verifiedData?.beneficiaryID;
    if (!id) return;
    await this.copyToClipboard(id);
  }

  private async copyToClipboard(value: string): Promise<void> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      this.copied = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copied = false;
        this.cdr.detectChanges();
      }, 2000);
    } catch (e) {
      console.error('Copy to clipboard failed', e);
    }
  }

  onTokenInput(event: Event): void {
    this.tokenInput = (event.target as HTMLInputElement).value;
    this.cdr.detectChanges();
  }

  onBeneficiaryIdInput(event: Event): void {
    this.beneficiaryIdInput = (event.target as HTMLInputElement).value;
    this.cdr.detectChanges();
  }

  showBeneficiaryMessage(): void {
    this.beneficiaryStatusMode = false;
    this.beneficiaryStatus = null;
    this.beneficiaryStatusError = '';
    this.beneficiaryStatusInfo = '';

    const token = (this.tokenInput || '').trim();
    if (!token) {
      this.messageError = 'Please paste the beneficiary token before fetching messages.';
      this.cdr.detectChanges();
      return;
    }

    if (this.verifiedData) {
      localStorage.setItem('beneficiaryVerified', JSON.stringify(this.verifiedData));
    }

    this.step = 'messages';
    this.messagesLoading = true;
    this.messageError = '';
    this.messageInfo = '';
    this.messages = [];
    this.selectedMessage = null;

    this.portalService.getBeneficiaryMessages({ portal_id: this.portalId, token }).subscribe({
      next: (res: any) => {
        this.messagesLoading = false;
        if (res && Array.isArray(res.data)) {
          this.messages = res.data;
          this.messageInfo = res?.message || 'Beneficiary messages loaded successfully.';
        } else {
          this.messageError = res?.message || 'No beneficiary messages were found.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messagesLoading = false;
        console.error('Get beneficiary messages error', err);
        this.messageError = 'An error occurred while fetching beneficiary messages. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  showBeneficiaryStatus(): void {
    this.beneficiaryStatusMode = true;
    this.messageError = '';
    this.messageInfo = '';
    this.beneficiaryStatusError = '';
    this.beneficiaryStatusInfo = '';

    const beneficiaryNo = (this.beneficiaryIdInput || '').trim();
    if (!beneficiaryNo) {
      this.beneficiaryStatusError = 'Please enter a Beneficiary ID before checking status.';
      this.cdr.detectChanges();
      return;
    }

    this.beneficiaryStatusLoading = true;
    this.portalService
      .getBeneficiaryStatus({
        portalId: this.portalId,
        mobileNo: this.userForm.controls.mobileNo.value,
        beneficiaryNo,
      })
      .subscribe({
        next: (res: any) => {
          this.beneficiaryStatusLoading = false;
          if (res && (res.status === true || res.status === 1 || res.success === true)) {
            this.beneficiaryStatus = res.data;
            this.selectedBeneficiaryStatus = res.data;
            this.cdr.detectChanges();
          } else {
            this.beneficiaryStatus = null;
            this.beneficiaryStatusError =
              res?.message || 'Could not fetch beneficiary status. Please try again.';
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          this.beneficiaryStatusLoading = false;
          console.error('Get beneficiary status error', err);
          this.beneficiaryStatus = null;
          this.beneficiaryStatusError =
            err?.error?.message ||
            err?.message ||
            'An error occurred while fetching beneficiary status. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  openBeneficiaryStatus(): void {
    this.selectedBeneficiaryStatus = this.beneficiaryStatus;
    this.cdr.detectChanges();
  }

  closeBeneficiaryStatus(): void {
    this.selectedBeneficiaryStatus = null;
    this.cdr.detectChanges();
  }

  getStatusFields(record: any): { label: string; value: string }[] {
    const b = record || {};
    const v = (key: string): string => {
      const val = b[key];
      return val === undefined || val === null || val === '' ? '—' : String(val);
    };
    const list: { label: string; value: string }[] = [
      { label: 'Name', value: v('firstName') },
      { label: 'Father / Husband Name', value: v('fatherHusbandName') },
      { label: 'Date of Birth', value: v('dateofBirth') },
      { label: 'Gender', value: v('gender') },
      { label: 'Mobile No', value: v('mobileNo') },
    ];
    if (Array.isArray(b.beneficiaryDetails)) {
      for (const d of b.beneficiaryDetails) {
        list.push({
          label: String((d && d.label) || ''),
          value: d && (d.value ?? '') !== '' ? String(d.value) : '—',
        });
      }
    }
    return list;
  }

  openMessageDetail(msg: any): void {
    this.selectedMessage = msg;
    this.cdr.detectChanges();
  }

  closeMessageDetail(): void {
    this.selectedMessage = null;
    this.cdr.detectChanges();
  }

  openBeneficiaryDetail(record: any): void {
    this.selectedBeneficiary = record;
    this.cdr.detectChanges();
  }

  closeBeneficiaryDetail(): void {
    this.selectedBeneficiary = null;
    this.cdr.detectChanges();
  }

  openVerifiedDetail(record: any): void {
    this.selectedVerifiedBeneficiary = record;
    this.cdr.detectChanges();
  }

  closeVerifiedDetail(): void {
    this.selectedVerifiedBeneficiary = null;
    this.cdr.detectChanges();
  }

  backToSuccess(): void {
    this.selectedMessage = null;
    this.step = 'success';
    this.cdr.detectChanges();
  }

  getMessageBody(msg: any): string {
    const body = msg?.message_Body || '';
    return this.truncate(body, 150);
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }


  get selectedUserTypeLabel(): string {
    const id = this.userForm.controls.userType.value;
    if (!id) return '';
    const match = this.userTypes.find((t) => t.userTypeId === id);
    if (!match) return '';
    return match.userTypeName + (match.userTypeNameHn ? ` (${match.userTypeNameHn})` : '');
  }

  isActiveUserType(type: PortalUserType): boolean {
    return this.userForm.controls.userType.value === type.userTypeId;
  }

  toggleUserTypeDropdown(): void {
    if (this.userTypesLoading) return;
    this.userTypeDropdownOpen = !this.userTypeDropdownOpen;
  }

  selectUserTypeOption(type: PortalUserType): void {
    this.userForm.controls.userType.setValue(type.userTypeId);
    this.userTypeDropdownOpen = false;
    this.userForm.controls.userType.markAsTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.userTypeDropdownOpen) return;
    const dd: Element | null = this.host.nativeElement.querySelector('.ut-dropdown');
    if (dd && !dd.contains(event.target as Node)) {
      this.userTypeDropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeCloseDropdown(): void {
    this.userTypeDropdownOpen = false;
  }

  closeModal(): void {
    this.reset();
    this.close.emit();
  }

}
