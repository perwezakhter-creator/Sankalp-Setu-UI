import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  UserRegisterRequest,
  RegisterResponse,
} from '../models/register';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RegisterService {
  private baseUrl = environment.apiUrl;

  private http = inject(HttpClient);

  private apiUrl = `${this.baseUrl}/api/User/Register`;

  register(request: UserRegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(this.apiUrl, request);
  }

}