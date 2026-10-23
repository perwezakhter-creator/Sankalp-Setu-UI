import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getRoleDisplayName } from '../../utils/role-display';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  @Input() collapsed = false;
  @Output() toggle = new EventEmitter<void>();
  readonly roleDisplayName = getRoleDisplayName(localStorage.getItem('Role'));
  readonly loggedInUserName = localStorage.getItem('UserName')?.trim() || this.roleDisplayName;
  readonly canViewDraftMessages = ['MKR', 'MAKER', 'CKR', 'CHECKER', 'APR', 'APPROVER']
    .includes((localStorage.getItem('Role') || '').trim().toUpperCase());

  private router = inject(Router);

  onToggle(): void {
    this.toggle.emit();
  }

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/') || this.router.url.startsWith(path + '?');
  }

  openCampaigns() {
    this.router.navigate(['/campaigns']);
  }

  openCampaignForm() {
    this.router.navigate(['/campaigns/create']);
  }

  openDashboard() {
    this.router.navigate(['/dashboard']);
  }

  openGroupManagement() {
    this.router.navigate(['/groups-subgroups']);
  }

  openBroadcast() {
    this.router.navigate(['/broadcast']);
  }

  openDraftMessages() {
    this.router.navigate(['/draft-messages']);
  }

  openSendBroadcast() {
    this.router.navigate(['/send-broadcast']);
  }

  openInterestMessage() {
    this.router.navigate(['/interest-message']);
  }

  openBlock() {
    this.router.navigate(['/block']);
  }

  openGallery() {
    this.router.navigate(['/gallery-admin']);
  }

  openLogin() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
