import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CryptoService } from './crypto.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DistrictService {

  private http = inject(HttpClient);
   private cryptoService = inject(CryptoService);
  private baseUrl = environment.apiUrl;
  apiUrl = `${this.baseUrl}/Master/GetDistrictList`;

  getDistrictList(): Observable<any> {

     const clientAES = localStorage.getItem('clientAES') || '';

    if (!clientAES) {
      throw new Error('Client AES key not found.');
    }

    // RSA encrypt the AES key
    const clientKey =  this.cryptoService.encryptRSA(clientAES);

    // Send RSA encrypted AES key
    const request = {
      clientKey: clientKey
    };

    return this.http.post<any>(this.apiUrl, request);

  }

}