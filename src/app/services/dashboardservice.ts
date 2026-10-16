import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CryptoService } from './crypto.service';
import { DashboardSummaryResponse, BlockWiseResponse } from '../models/DashboardSummary';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private cryptoService = inject(CryptoService);

  private apiUrl = `${this.baseUrl}/Dashboard`;

  getSummary(): Observable<DashboardSummaryResponse> {
    const clientAES = localStorage.getItem('clientAES') || '';
    let clientKey = '';

    if (clientAES) {
      try {
        clientKey = this.cryptoService.encryptRSA(clientAES);
      } catch (err) {
        console.warn('RSA encryption of client AES key failed, proceeding with plain request', err);
      }
    }

    const request = {
      clientKey: clientKey || null
    };

    return this.http.post<DashboardSummaryResponse>(`${this.apiUrl}/Summary`, request);
  }

  getBlockWise(districtCode: string): Observable<BlockWiseResponse> {
    const request = {
      districtCode: districtCode
    };

    return this.http.post<BlockWiseResponse>(`${this.apiUrl}/BlockWise`, request);
  }
}