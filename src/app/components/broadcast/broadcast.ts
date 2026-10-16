import { Component, OnInit, inject, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService } from '../../services/message.service';
import { PortalService } from '../../services/portal';
import { DistrictService } from '../../services/district';
import { CryptoService } from '../../services/crypto.service';
import { SelectDropdownComponent, DropdownOption } from '../select-dropdown/select-dropdown';
import {
  InsertBroadcastMessageRequest,
  BroadcastMessageData
} from '../../models/broadcast-message';

interface DistrictOption {
  code: string;
  name: string;
}

@Component({
  selector: 'app-broadcast',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, SelectDropdownComponent],
  templateUrl: './broadcast.html',
  styleUrl: './broadcast.css'
})
export class BroadcastComponent implements OnInit {
  private messageService = inject(MessageService);
  private portalService = inject(PortalService);
  private districtService = inject(DistrictService);
  private cryptoService = inject(CryptoService);
  private cdr = inject(ChangeDetectorRef);

  loading: boolean = false;
  listLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  createdId: number | null = null;

  @ViewChild('createNoticeDialog') createNoticeDialog!: ElementRef<HTMLDialogElement>;

  openCreateModal(): void {
    this.errorMessage = '';
    this.createNoticeDialog.nativeElement.showModal();
  }

  closeCreateModal(): void {
    if (!this.loading) {
      this.createNoticeDialog.nativeElement.close();
    }
  }

  onCreateModalCancel(event: Event): void {
    if (this.loading) {
      event.preventDefault();
    }
  }

  // POPUP MODAL STATE
  showSuccessModal: boolean = false;
  modalTitle: string = 'Saved Successfully!';
  modalMessage: string = '';
  modalNoticeId: number | null = null;

  broadcastList: BroadcastMessageData[] = [];
  
  portalOptions: DropdownOption[] = [];
  portalLoading = false;
  portalError = '';

  userTypeOptions: DropdownOption[] = [];
  userTypesLoading = false;
  userTypesError = '';

  messageTypeOptions: DropdownOption[] = [];
  messageTypesLoading = false;
  messageTypesError = '';

  districts: DistrictOption[] = [];
  districtsLoading = false;
  districtsError = '';
  districtSearchTerm = '';
  showDistrictSelector = false;
  districtSelectionError = '';
  selectedDistrictCodes: string[] = [];
  pendingDistrictCodes: string[] = [];

  broadcastForm = new FormGroup({
    message_head: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    message_body: new FormControl('', [Validators.required]),
    validity_in_minutes: new FormControl(1440, [Validators.required, Validators.min(1)]),
    is_active: new FormControl<'Y' | 'N'>('Y', [Validators.required]),
    portal_id: new FormControl(''),
    user_type_id: new FormControl(''),
    mesg_type_id: new FormControl('', [Validators.required]),
    is_all_district: new FormControl(true),
    photo1path: new FormControl(''),
    videopath: new FormControl(''),
    documentpath: new FormControl('')
  });

  ngOnInit(): void {
    this.loadBroadcastMessages();
    this.loadPortals();
    this.loadMessageTypes();
  }

  loadBroadcastMessages(): void {
    this.listLoading = true;
    this.messageService.getBroadcastMessages().subscribe({
      next: (res) => {
        this.listLoading = false;
        if (res && res.status && Array.isArray(res.data)) {
          this.broadcastList = res.data;
        } else {
          this.broadcastList = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.listLoading = false;
        console.error('Failed to load broadcast messages:', err);
        this.cdr.detectChanges();
      }
    });
  }

  loadPortals(): void {
    this.portalLoading = true;
    this.portalError = '';
    this.broadcastForm.get('portal_id')?.disable();
    this.portalService.getPortals().subscribe({
      next: (res: any) => {
        this.portalLoading = false;
        if (res && Array.isArray(res.data)) {
          this.portalOptions = res.data.map((item: any) => ({
            code: String(item.portal_id),
            name: this.decrypt(item.portal_name)
          }));
        } else {
          this.portalOptions = [];
          this.portalError = 'No portals are available.';
        }
        this.broadcastForm.get('portal_id')?.enable();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.portalLoading = false;
        this.portalOptions = [];
        this.portalError = 'Failed to load portals. Please try again.';
        this.broadcastForm.get('portal_id')?.enable();
        console.error('Failed to load portals:', err);
        this.cdr.detectChanges();
      }
    });
  }

  loadMessageTypes(): void {
    this.messageTypesLoading = true;
    this.messageTypesError = '';
    this.messageService.getMessageTypes().subscribe({
      next: (res: any) => {
        this.messageTypesLoading = false;
        if (res?.status && Array.isArray(res.data)) {
          this.messageTypeOptions = res.data.map((item: any) => ({
            code: String(item.mesg_type_id ?? item.MesgTypeID ?? ''),
            name: String(item.mesg_type_name ?? item.MesgTypeName ?? '')
          })).filter((item: DropdownOption) => item.code && item.name);
        } else {
          this.messageTypesError = 'No message types are available.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.messageTypesLoading = false;
        this.messageTypesError = 'Failed to load message types. Please try again.';
        console.error('Failed to load message types:', err);
        this.cdr.detectChanges();
      }
    });
  }

  onPortalChange(): void {
    const portalId = this.broadcastForm.get('portal_id')?.value;
    const utControl = this.broadcastForm.get('user_type_id');
    this.userTypeOptions = [];
    this.userTypesError = '';
    this.userTypesLoading = false;
    utControl?.setValue('', { emitEvent: false });
    utControl?.disable();

    if (!portalId) {
      return;
    }

    this.userTypesLoading = true;
    this.portalService.getUserType(portalId).subscribe({
      next: (res: any) => {
        this.userTypesLoading = false;
        if (res && Array.isArray(res.data)) {
          this.userTypeOptions = res.data.map((item: any) => ({
            code: String(item.User_Type_ID ?? item.user_type_id ?? ''),
            name: this.decrypt(item.User_Type_Name ?? item.user_type_name ?? '')
          }));
        } else {
          this.userTypeOptions = [];
          this.userTypesError = 'No user types are available for this portal.';
        }
        utControl?.enable();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.userTypesLoading = false;
        this.userTypeOptions = [];
        this.userTypesError = 'Failed to load user types. Please try again.';
        utControl?.enable();
        console.error('Failed to load portal user types:', err);
        this.cdr.detectChanges();
      }
    });
  }

  private decrypt(value: any): string {
    if (value === undefined || value === null || value === '') return '';
    const clientAES = localStorage.getItem('clientAES') || '';
    try {
      const decrypted = this.cryptoService.decryptAES(String(value), clientAES);
      return decrypted || String(value);
    } catch {
      return String(value);
    }
  }

  get filteredDistricts(): DistrictOption[] {
    const search = this.districtSearchTerm.trim().toLowerCase();
    if (!search) return this.districts;
    return this.districts.filter(district =>
      district.code.toLowerCase().includes(search) || district.name.toLowerCase().includes(search));
  }

  get allPendingDistrictsSelected(): boolean {
    return this.districts.length > 0 && this.districts.every(district => this.pendingDistrictCodes.includes(district.code));
  }

  onAllDistrictChange(event: Event): void {
    const isAllDistrict = (event.target as HTMLInputElement).checked;
    this.broadcastForm.patchValue({ is_all_district: isAllDistrict });

    if (isAllDistrict) {
      this.selectedDistrictCodes = [];
      return;
    }

    this.openDistrictSelector();
  }

  openDistrictSelector(): void {
    this.districtSelectionError = '';
    this.districtSearchTerm = '';
    this.pendingDistrictCodes = [...this.selectedDistrictCodes];
    this.showDistrictSelector = true;
    this.loadDistricts();
  }

  closeDistrictSelector(): void {
    this.showDistrictSelector = false;
    this.districtSelectionError = '';

    if (!this.selectedDistrictCodes.length) {
      this.broadcastForm.patchValue({ is_all_district: true });
    }
  }

  loadDistricts(): void {
    if (this.districtsLoading || this.districts.length) return;

    this.districtsLoading = true;
    this.districtsError = '';
    this.districtService.getDistrictList().subscribe({
      next: (res: any) => {
        this.districtsLoading = false;
        if (res?.status && Array.isArray(res.data)) {
          this.districts = res.data
            .map((item: any) => ({
              code: this.decrypt(item.district_Code ?? item.District_Code ?? item.district_code),
              name: this.decrypt(item.district_Name ?? item.District_Name ?? item.district_name)
            }))
            .filter((district: DistrictOption) => district.code && district.name);
        } else {
          this.districtsError = 'No districts are available.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.districtsLoading = false;
        this.districtsError = 'Failed to load districts. Please try again.';
        console.error('Failed to load districts:', err);
        this.cdr.detectChanges();
      }
    });
  }

  isDistrictPending(code: string): boolean {
    return this.pendingDistrictCodes.includes(code);
  }

  toggleDistrict(code: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.pendingDistrictCodes = checked
      ? [...new Set([...this.pendingDistrictCodes, code])]
      : this.pendingDistrictCodes.filter(item => item !== code);
    this.districtSelectionError = '';
  }

  toggleAllDistricts(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.pendingDistrictCodes = checked ? this.districts.map(district => district.code) : [];
    this.districtSelectionError = '';
  }

  saveDistrictSelection(): void {
    if (!this.pendingDistrictCodes.length) {
      this.districtSelectionError = 'Select at least one district or choose All districts.';
      return;
    }

    this.selectedDistrictCodes = [...this.pendingDistrictCodes];
    this.showDistrictSelector = false;
    this.districtSelectionError = '';
  }

  submitBroadcast(): void {
    if (this.loading) return;

    if (this.broadcastForm.invalid) {
      this.broadcastForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.createdId = null;

    const val = this.broadcastForm.value;

    const payload: InsertBroadcastMessageRequest = {
      message_head: val.message_head?.trim(),
      message_body: val.message_body?.trim() ?? '',
      validity_in_minutes: Number(val.validity_in_minutes) || 1440,
      is_active: val.is_active || 'Y',
      portal_id: val.portal_id ? Number(val.portal_id) : undefined,
      user_type_id: val.user_type_id ? String(val.user_type_id) : undefined,
      mesg_type_id: Number(val.mesg_type_id),
      photo1path: val.photo1path?.trim() || undefined,
      videopath: val.videopath?.trim() || undefined,
      documentpath: val.documentpath?.trim() || undefined,
      is_all_district: val.is_all_district !== false,
      district_codes: val.is_all_district === false ? this.selectedDistrictCodes : undefined,
      entryby: localStorage.getItem('UserName') || 'Admin'
    };

    this.messageService.insertBroadcastMessage(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.status) {
          this.createdId = res.bmsg_id ?? null;
          this.closeCreateModal();
          
          this.modalTitle = 'Saved Successfully!';
          this.modalMessage = val.is_all_district === false
            ? 'Your broadcast advisory has been published to the selected districts.'
            : 'Your broadcast advisory has been published successfully to all citizens.';
          this.modalNoticeId = this.createdId;
          this.showSuccessModal = true;

          this.successMessage = `Broadcast message successfully published! Notice ID: #${this.createdId}`;
          this.broadcastForm.reset({
            message_head: '',
            message_body: '',
            validity_in_minutes: 1440,
            is_active: 'Y',
            portal_id: '',
            user_type_id: '',
            mesg_type_id: '',
            is_all_district: true,
            photo1path: '',
            videopath: '',
            documentpath: ''
          });
          this.selectedDistrictCodes = [];
          this.userTypeOptions = [];
          this.broadcastForm.get('user_type_id')?.disable();
          this.loadBroadcastMessages();
        } else {
          this.errorMessage = res?.message || 'Failed to save broadcast message.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error inserting broadcast:', err);
        this.errorMessage = err?.error?.message || 'Server error occurred while inserting broadcast record.';
        this.cdr.detectChanges();
      }
    });
  }

  setValidityQuick(minutes: number): void {
    this.broadcastForm.patchValue({ validity_in_minutes: minutes });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }
}
