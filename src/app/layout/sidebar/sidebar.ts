import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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

  private router = inject(Router);

  onToggle(): void {
    this.toggle.emit();
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  openDashboard() {
    this.router.navigate(['/dashboard']);
  }

  openBroadcast() {
    this.router.navigate(['/broadcast']);
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
