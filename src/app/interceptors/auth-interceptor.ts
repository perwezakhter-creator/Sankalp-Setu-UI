import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('UserId') || localStorage.getItem('UserName') || '';
  const userRole = localStorage.getItem('Role') || '';

  const headers: Record<string, string> = {};

  if (token) {
    headers['X-Client-Token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (userId) {
    headers['X-User-Id'] = userId;
  }

  if (userRole) {
    headers['X-User-Role'] = userRole;
  }

  if (Object.keys(headers).length > 0) {
    req = req.clone({
      setHeaders: headers
    });
  }

  return next(req);
};
