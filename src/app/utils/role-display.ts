const ROLE_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  ADM: 'Admin',
  ADMIN: 'Admin',
  MKR: 'Maker',
  MAKER: 'Maker',
  CKR: 'Checker',
  CHECKER: 'Checker',
  APR: 'Approver',
  APPROVER: 'Approver',
  MOB: 'Mobile User'
};

export function getRoleDisplayName(role: string | null | undefined): string {
  const normalizedRole = role?.trim().toUpperCase() ?? '';
  if (!normalizedRole) return 'User';

  return ROLE_DISPLAY_NAMES[normalizedRole]
    ?? normalizedRole.toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
}
