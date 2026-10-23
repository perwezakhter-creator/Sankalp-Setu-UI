import { Component, OnInit, inject, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService } from '../../services/message.service';
import { SelectDropdownComponent, DropdownOption } from '../select-dropdown/select-dropdown';
import {
  InsertBroadcastMessageRequest,
  BroadcastMessageData
} from '../../models/broadcast-message';

type AttachmentPathControl = 'photo1path' | 'videopath' | 'documentpath' | 'audiopath';

@Component({
  selector: 'app-broadcast',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, SelectDropdownComponent],
  templateUrl: './broadcast.html',
  styleUrl: './broadcast.css'
})
export class BroadcastComponent implements OnInit {
  private messageService = inject(MessageService);
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
  
  messageTypeOptions: DropdownOption[] = [];
  messageTypesLoading = false;
  messageTypesError = '';

  attachmentEnabled: Record<AttachmentPathControl, boolean> = {
    photo1path: false,
    videopath: false,
    documentpath: false,
    audiopath: false
  };

  broadcastForm = new FormGroup({
    message_head: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]),
    message_body: new FormControl('', [Validators.required, Validators.minLength(10)]),
    mesg_type_id: new FormControl('', [Validators.required]),
    photo1path: new FormControl('', [Validators.maxLength(2048)]),
    videopath: new FormControl('', [Validators.maxLength(2048)]),
    documentpath: new FormControl('', [Validators.maxLength(2048)]),
    audiopath: new FormControl('', [Validators.maxLength(2048)])
  });

  ngOnInit(): void {
    this.loadBroadcastMessages();
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

  loadMessageTypes(): void {
    this.messageTypesLoading = true;
    this.messageTypesError = '';
    this.messageService.getMessageTypes().subscribe({
      next: (res: any) => {
        this.messageTypesLoading = false;
        if (res?.status && Array.isArray(res.data)) {
          this.messageTypeOptions = res.data.map((item: any) => {
            const code = String(item.mesg_type_id ?? item.MesgTypeID ?? '');
            const name = String(item.mesg_type_name ?? item.MesgTypeName ?? '').trim();
            const abbreviation = String(item.msg_abbr_code ?? item.MsgAbbrCode ?? '').trim();

            return {
              code,
              name: abbreviation ? `${name} - (${abbreviation})` : name
            };
          }).filter((item: DropdownOption) => item.code && item.name);
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

  toggleAttachment(controlName: AttachmentPathControl, event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.attachmentEnabled[controlName] = enabled;

    if (!enabled) {
      this.broadcastForm.get(controlName)?.setValue('');
      this.broadcastForm.get(controlName)?.markAsUntouched();
    }
  }

  private resetAttachmentSelection(): void {
    (Object.keys(this.attachmentEnabled) as AttachmentPathControl[])
      .forEach(controlName => this.attachmentEnabled[controlName] = false);
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
      mesg_type_id: Number(val.mesg_type_id),
      photo1path: val.photo1path?.trim() || undefined,
     
      photo2path: val.audiopath?.trim() || undefined,
      videopath: val.videopath?.trim() || undefined,
      documentpath: val.documentpath?.trim() || undefined,
      entryby: localStorage.getItem('UserName') || 'Admin'
    };

    this.messageService.insertBroadcastMessage(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.status) {
          this.createdId = res.bmsg_id ?? null;
          this.closeCreateModal();
          
          this.modalTitle = 'Saved Successfully!';
          this.modalMessage = 'Your broadcast advisory has been published successfully to all citizens.';
          this.modalNoticeId = this.createdId;
          this.showSuccessModal = true;

          this.successMessage = `Broadcast message successfully published! Notice ID: #${this.createdId}`;
          this.broadcastForm.reset({
            message_head: '',
            message_body: '',
            mesg_type_id: '',
            photo1path: '',
            videopath: '',
            documentpath: '',
            audiopath: ''
          });
          this.resetAttachmentSelection();
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

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }
}
