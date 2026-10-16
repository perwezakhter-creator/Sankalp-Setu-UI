import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  SendOtpRequest,
  VerifyOtpRequest,
  OtpResponse,
} from '../models/otp';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OtpService {
  private baseUrl = environment.apiUrl;

  private http = inject(HttpClient);

  sendOtp(request: SendOtpRequest): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.baseUrl}/api/Otp/SendOtp`, request);
  }

  verifyOtp(request: VerifyOtpRequest): Observable<OtpResponse> {
    return this.http.post<OtpResponse>(`${this.baseUrl}/api/Otp/VerifyOtp`, request);
  }

}