import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

const DRAFT_MESSAGE_ROLES = new Set(['MKR', 'MAKER', 'CKR', 'CHECKER', 'APR', 'APPROVER']);

export const draftMessageRoleGuard: CanActivateFn = () => {
  const router = inject(Router);
  const role = (localStorage.getItem('Role') || '').trim().toUpperCase();
  return DRAFT_MESSAGE_ROLES.has(role) ? true : router.createUrlTree(['/dashboard']);
};
