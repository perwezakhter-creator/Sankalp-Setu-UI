import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService } from '../../services/message.service';
import { PortalService } from '../../services/portal';
import { CryptoService } from '../../services/crypto.service';
import { SelectDropdownComponent, DropdownOption } from '../select-dropdown/select-dropdown';
import {
  InsertBroadcastMessageRequest,
  BroadcastMessageData
} from '../../models/broadcast-message';

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
  private cryptoService = inject(CryptoService);
  private cdr = inject(ChangeDetectorRef);

  loading: boolean = false;
  listLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  createdId: number | null = null;

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

  broadcastForm = new FormGroup({
    message_head: new FormControl('', [Validators.required, Validators.maxLength(255)]),
    message_body: new FormControl('', [Validators.required]),
    validity_in_minutes: new FormControl(1440, [Validators.required, Validators.min(1)]),
    is_active: new FormControl<'Y' | 'N'>('Y', [Validators.required]),
    portal_id: new FormControl(''),
    user_type_id: new FormControl(''),
    photo1path: new FormControl(''),
    videopath: new FormControl(''),
    documentpath: new FormControl('')
  });

  ngOnInit(): void {
    this.loadBroadcastMessages();
    this.loadPortals();
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

  submitBroadcast(): void {
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
      photo1path: val.photo1path?.trim() || undefined,
      videopath: val.videopath?.trim() || undefined,
      documentpath: val.documentpath?.trim() || undefined,
      entryby: localStorage.getItem('UserName') || 'Admin'
    };

    this.messageService.insertBroadcastMessage(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.status) {
          this.createdId = res.bmsg_id ?? null;
          
          this.modalTitle = 'Saved Successfully!';
          this.modalMessage = 'Your broadcast advisory has been published successfully to all citizens.';
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
            photo1path: '',
            videopath: '',
            documentpath: ''
          });
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
