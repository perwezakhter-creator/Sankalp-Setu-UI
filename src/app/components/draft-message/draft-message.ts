import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MessageService } from '../../services/message.service';
import { BroadcastMessageData } from '../../models/broadcast-message';
import { getRoleDisplayName } from '../../utils/role-display';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-draft-message',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './draft-message.html',
  styleUrl: './draft-message.css'
})
export class DraftMessageComponent implements OnInit {
  private readonly messageService = inject(MessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currentRole = (localStorage.getItem('Role') || '').trim().toUpperCase();
  readonly roleDisplayName = getRoleDisplayName(this.currentRole);
  private readonly entryByValues = new Set(
    [this.currentRole, this.roleDisplayName, localStorage.getItem('UserName') || '']
      .map(value => value.trim().toUpperCase())
      .filter(Boolean)
  );

  messages: BroadcastMessageData[] = [];
  selectedIds = new Set<number>();
  loading = false;
  forwarding = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadMessages();
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get allSelected(): boolean {
    return this.messages.length > 0 && this.messages.every(message => this.selectedIds.has(message.bmsg_id));
  }

  get hasPartialSelection(): boolean {
    return this.selectedCount > 0 && !this.allSelected;
  }

  get destinationLabel(): string {
    if (this.isMaker) return 'Checker';
    if (this.isChecker) return 'Approver';
    return 'Final Approval';
  }

  get queueDescription(): string {
    if (this.isMaker) return 'Messages created by Maker that have not yet been forwarded to Checker.';
    if (this.isChecker) return 'Messages forwarded by Maker and awaiting verification.';
    return 'Verified messages awaiting final approval.';
  }

  get stageLabel(): string {
    if (this.isMaker) return 'Draft';
    if (this.isChecker) return 'Pending Verification';
    return 'Pending Approval';
  }

  get isMaker(): boolean {
    return this.currentRole === 'MKR' || this.currentRole === 'MAKER';
  }

  get isChecker(): boolean {
    return this.currentRole === 'CKR' || this.currentRole === 'CHECKER';
  }

  get isApprover(): boolean {
    return this.currentRole === 'APR' || this.currentRole === 'APPROVER';
  }

  loadMessages(): void {
    this.loading = true;
    this.errorMessage = '';
    this.selectedIds.clear();

    this.messageService.getBroadcastMessages().subscribe({
      next: response => {
        this.loading = false;
        const allMessages: BroadcastMessageData[] = response?.status && Array.isArray(response.data)
          ? response.data
          : [];
        this.messages = allMessages.filter(message => this.isPendingForCurrentRole(message));
        if (!response?.status) this.errorMessage = response?.message || 'Unable to load draft messages.';
        this.cdr.detectChanges();
      },
      error: error => {
        this.loading = false;
        this.messages = [];
        this.errorMessage = error?.error?.message || 'Unable to load draft messages.';
        this.cdr.detectChanges();
      }
    });
  }

  isSelected(messageId: number): boolean {
    return this.selectedIds.has(messageId);
  }

  private isPendingForCurrentRole(message: BroadcastMessageData): boolean {
    const matchesCurrentQueue = this.entryByValues.has(
      (message.entryby || '').trim().toUpperCase()
    );

    if (!matchesCurrentQueue || message.is_approved === true) return false;
    if (this.isApprover) return message.is_verified === true;
    if (this.isChecker || this.isMaker) return message.is_verified !== true;
    return false;
  }

  toggleMessage(messageId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.selectedIds.add(messageId);
    else this.selectedIds.delete(messageId);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.clear();
    if (checked) this.messages.forEach(message => this.selectedIds.add(message.bmsg_id));
  }

  forwardOne(message: BroadcastMessageData): void {
    if (this.isChecker) {
      this.verifyMessages([message.bmsg_id]);
      return;
    }
    if (this.isApprover) {
      this.approveMessages([message.bmsg_id]);
      return;
    }
    this.forwardMessages([message.bmsg_id]);
  }

  forwardSelected(): void {
    if (this.isChecker) {
      this.verifyMessages([...this.selectedIds]);
      return;
    }
    if (this.isApprover) {
      this.approveMessages([...this.selectedIds]);
      return;
    }
    this.forwardMessages([...this.selectedIds]);
  }

  returnForCorrection(message: BroadcastMessageData): void {
    if ((!this.isChecker && !this.isApprover) || this.forwarding) return;

    const destination = this.isChecker ? 'Maker' : 'Checker';
    if (!confirm(`Return this message to ${destination} for correction?`)) return;

    this.forwarding = true;
    this.successMessage = '';
    this.errorMessage = '';

    const returnRequest = this.isChecker
      ? this.messageService.updateBroadcastVerification(message.bmsg_id, false)
      : this.messageService.updateBroadcastApproval(message.bmsg_id, false);

    returnRequest.subscribe({
      next: response => {
        this.forwarding = false;
        if (response?.status) {
          this.successMessage = response.message || `Message returned to ${destination} for correction.`;
          this.loadMessages();
        } else {
          this.errorMessage = response?.message || `Unable to return the message to ${destination}.`;
        }
        this.cdr.detectChanges();
      },
      error: error => {
        this.forwarding = false;
        this.errorMessage = error?.error?.message || `Unable to return the message to ${destination}.`;
        this.cdr.detectChanges();
      }
    });
  }

  isReturnedToMaker(message: BroadcastMessageData): boolean {
    return this.isMaker && message.is_verified === false && !!message.verified_by;
  }

  isReturnedToChecker(message: BroadcastMessageData): boolean {
    return this.isChecker && message.is_approved === false && !!message.approved_by;
  }

  isReturnedMessage(message: BroadcastMessageData): boolean {
    return this.isReturnedToMaker(message) || this.isReturnedToChecker(message);
  }

  returnedMessageLabel(message: BroadcastMessageData): string {
    if (this.isReturnedToMaker(message)) return 'Returned by Checker for correction';
    if (this.isReturnedToChecker(message)) return 'Returned by Approver for correction';
    return '';
  }

  statusLabelFor(message: BroadcastMessageData): string {
    if (this.isReturnedToMaker(message)) return 'Returned by Checker';
    if (this.isReturnedToChecker(message)) return 'Returned by Approver';
    return this.stageLabel;
  }

  private verifyMessages(messageIds: number[]): void {
    if (!messageIds.length || this.forwarding) return;

    const confirmation = messageIds.length === 1
      ? 'Verify this message and forward it to Approver?'
      : `Verify ${messageIds.length} selected messages and forward them to Approver?`;
    if (!confirm(confirmation)) return;

    this.forwarding = true;
    this.successMessage = '';
    this.errorMessage = '';

    forkJoin(messageIds.map(id => this.messageService.updateBroadcastVerification(id, true))).subscribe({
      next: responses => {
        this.forwarding = false;
        const successfulCount = responses.filter(response => response?.status).length;
        if (successfulCount === messageIds.length) {
          this.successMessage = `${successfulCount} message(s) verified and forwarded to Approver.`;
          this.loadMessages();
        } else {
          this.errorMessage = `${successfulCount} of ${messageIds.length} message(s) were verified. Refresh and try again.`;
          this.loadMessages();
        }
        this.cdr.detectChanges();
      },
      error: error => {
        this.forwarding = false;
        this.errorMessage = error?.error?.message || 'Unable to verify the selected messages.';
        this.cdr.detectChanges();
      }
    });
  }

  private approveMessages(messageIds: number[]): void {
    if (!messageIds.length || this.forwarding) return;

    const confirmation = messageIds.length === 1
      ? 'Approve this message?'
      : `Approve ${messageIds.length} selected messages?`;
    if (!confirm(confirmation)) return;

    this.forwarding = true;
    this.successMessage = '';
    this.errorMessage = '';

    forkJoin(messageIds.map(id => this.messageService.updateBroadcastApproval(id, true))).subscribe({
      next: responses => {
        this.forwarding = false;
        const successfulCount = responses.filter(response => response?.status).length;
        if (successfulCount === messageIds.length) {
          this.successMessage = `${successfulCount} message(s) approved successfully.`;
          this.loadMessages();
        } else {
          this.errorMessage = `${successfulCount} of ${messageIds.length} message(s) were approved. Refresh and try again.`;
          this.loadMessages();
        }
        this.cdr.detectChanges();
      },
      error: error => {
        this.forwarding = false;
        this.errorMessage = error?.error?.message || 'Unable to approve the selected messages.';
        this.cdr.detectChanges();
      }
    });
  }

  private forwardMessages(messageIds: number[]): void {
    if (!messageIds.length || this.forwarding) return;

    const confirmation = messageIds.length === 1
      ? `Forward this message to ${this.destinationLabel}?`
      : `Forward ${messageIds.length} selected messages to ${this.destinationLabel}?`;
    if (!confirm(confirmation)) return;

    this.forwarding = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.messageService.forwardDraftMessages(messageIds).subscribe({
      next: response => {
        this.forwarding = false;
        if (response?.status) {
          this.successMessage = response.message || `${response.processedCount} message(s) forwarded successfully.`;
          this.loadMessages();
        } else {
          this.errorMessage = response?.message || 'Unable to forward the selected messages.';
        }
        this.cdr.detectChanges();
      },
      error: error => {
        this.forwarding = false;
        this.errorMessage = error?.error?.message || 'Unable to forward the selected messages.';
        this.cdr.detectChanges();
      }
    });
  }
}
