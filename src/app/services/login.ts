import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { LoginRequest } from '../models/login-request';
import { LoginResponse } from '../models/login-response';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Login {

  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private apiUrl = `${this.baseUrl}/Auth/Login`;

  //private apiUrl = 'http://10.133.20.147:81/api/Users/Login';
  //private apiUrl = 'https://localhost:7131/api/Auth/Login';

  login(request: LoginRequest): Observable<LoginResponse> {

    return this.http.post<LoginResponse>(this.apiUrl, request);

  }

}