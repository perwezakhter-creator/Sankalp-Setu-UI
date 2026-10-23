import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getRoleDisplayName } from '../../utils/role-display';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  @Input() collapsed = false;
  @Output() toggle = new EventEmitter<void>();
  readonly roleDisplayName = getRoleDisplayName(localStorage.getItem('Role'));

  constructor(private router: Router) {}

  onToggle(): void {
    this.toggle.emit();
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}

