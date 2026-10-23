import { Component, OnInit, inject, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService } from '../../services/message.service';
import { SelectDropdownComponent, DropdownOption } from '../select-dropdown/select-dropdown';
import {
  InsertBroadcastMessageRequest,
  BroadcastMessageData
} from '../../models/broadcast-message';

type AttachmentType = 'photo' | 'video' | 'document' | 'audio';

interface AttachmentRule {
  maxBytes: number;
  extensions: string[];
  description: string;
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

  attachmentEnabled: Record<AttachmentType, boolean> = {
    photo: false,
    video: false,
    document: false,
    audio: false
  };
  attachmentFiles: Record<AttachmentType, File | null> = {
    photo: null,
    video: null,
    document: null,
    audio: null
  };
  secondPhotoFile: File | null = null;
  attachmentErrors: Record<AttachmentType, string> = {
    photo: '',
    video: '',
    document: '',
    audio: ''
  };
  private readonly attachmentRules: Record<AttachmentType, AttachmentRule> = {
    photo: {
      maxBytes: 5 * 1024 * 1024,
      extensions: ['jpg', 'jpeg', 'png', 'webp'],
      description: 'JPG, PNG or WEBP · Max 5 MB'
    },
    video: {
      maxBytes: 25 * 1024 * 1024,
      extensions: ['mp4', 'webm', 'mov'],
      description: 'MP4, WEBM or MOV · Max 25 MB'
    },
    document: {
      maxBytes: 10 * 1024 * 1024,
      extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
      description: 'PDF, Office, TXT or CSV · Max 10 MB'
    },
    audio: {
      maxBytes: 10 * 1024 * 1024,
      extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg'],
      description: 'MP3, WAV, M4A, AAC or OGG · Max 10 MB'
    }
  };

  broadcastForm = new FormGroup({
    message_head: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]),
    message_body: new FormControl('', [Validators.required, Validators.minLength(10)]),
    mesg_type_id: new FormControl('', [Validators.required])
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

  toggleAttachment(type: AttachmentType, event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.attachmentEnabled[type] = enabled;

    if (!enabled) {
      this.attachmentFiles[type] = null;
      if (type === 'photo') this.secondPhotoFile = null;
      this.attachmentErrors[type] = '';
    }
  }

  onPhotoSelected(event: Event, slot: 1 | 2): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      if (slot === 1) this.attachmentFiles.photo = null;
      else this.secondPhotoFile = null;
      this.updatePhotoValidationMessage();
      return;
    }

    const validationError = this.validateAttachment(file, 'photo');
    if (validationError) {
      if (slot === 1) this.attachmentFiles.photo = null;
      else this.secondPhotoFile = null;
      input.value = '';
      this.attachmentErrors.photo = validationError;
      return;
    }

    if (slot === 1) this.attachmentFiles.photo = file;
    else this.secondPhotoFile = file;
    this.updatePhotoValidationMessage();
  }

  onAttachmentSelected(event: Event, type: AttachmentType): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.attachmentErrors[type] = '';

    if (!file) {
      this.attachmentFiles[type] = null;
      return;
    }

    const validationError = this.validateAttachment(file, type);
    if (validationError) {
      this.attachmentFiles[type] = null;
      input.value = '';
      this.attachmentErrors[type] = validationError;
      return;
    }

    this.attachmentFiles[type] = file;
  }

  private validateAttachment(file: File, type: AttachmentType): string {
    const rule = this.attachmentRules[type];
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!rule.extensions.includes(extension))
      return `Unsupported file type. ${rule.description}.`;
    if (file.size > rule.maxBytes)
      return `Selected file is too large. ${rule.description}.`;
    return '';
  }

  private updatePhotoValidationMessage(): void {
    const selectedCount = Number(!!this.attachmentFiles.photo) + Number(!!this.secondPhotoFile);
    this.attachmentErrors.photo = selectedCount === 1 ? 'Upload one more photo.' : '';
  }

  private resetAttachmentSelection(): void {
    (Object.keys(this.attachmentEnabled) as AttachmentType[]).forEach(type => {
      this.attachmentEnabled[type] = false;
      this.attachmentFiles[type] = null;
      this.attachmentErrors[type] = '';
    });
    this.secondPhotoFile = null;
  }

  submitBroadcast(): void {
    if (this.loading) return;

    if (this.broadcastForm.invalid) {
      this.broadcastForm.markAllAsTouched();
      return;
    }

    let missingAttachment = false;
    if (this.attachmentEnabled.photo && (!this.attachmentFiles.photo || !this.secondPhotoFile)) {
      const selectedCount = Number(!!this.attachmentFiles.photo) + Number(!!this.secondPhotoFile);
      this.attachmentErrors.photo = selectedCount === 1
        ? 'Upload one more photo.'
        : 'Upload both required photos before publishing.';
      missingAttachment = true;
    }

    (['video', 'document', 'audio'] as const).forEach(type => {
      if (this.attachmentEnabled[type] && !this.attachmentFiles[type]) {
        this.attachmentErrors[type] = 'Select a file before publishing.';
        missingAttachment = true;
      }
    });
    if (missingAttachment) return;

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.createdId = null;

    const val = this.broadcastForm.value;

    const payload: InsertBroadcastMessageRequest = {
      message_head: val.message_head?.trim(),
      message_body: val.message_body?.trim() ?? '',
      mesg_type_id: Number(val.mesg_type_id),
      entryby: localStorage.getItem('UserName') || 'Admin'
    };

    const files: Partial<Record<'photo1' | 'photo2' | 'video' | 'document' | 'audio', File>> = {};
    if (this.attachmentFiles.photo) files.photo1 = this.attachmentFiles.photo;
    if (this.secondPhotoFile) files.photo2 = this.secondPhotoFile;
    (['video', 'document', 'audio'] as const).forEach(type => {
      const file = this.attachmentFiles[type];
      if (file) files[type] = file;
    });

    this.messageService.insertBroadcastMessageWithAttachments(payload, files).subscribe({
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
            mesg_type_id: ''
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
