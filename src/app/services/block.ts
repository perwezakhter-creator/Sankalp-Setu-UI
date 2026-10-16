import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CryptoService } from './crypto.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BlockService {

   private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private cryptoService = inject(CryptoService);
  private apiUrl = `${this.baseUrl}/Master/GetBlockList`;

  getBlockList(distCode: string) {

     const clientAES = localStorage.getItem('clientAES') || '';
     if (!clientAES) {
      throw new Error('Client AES key not found.');
    }

    // RSA encrypt the AES key
    const clientKey = this.cryptoService.encryptRSA(clientAES);
    // AES encrypt the district code
    const encDistCode = this.cryptoService.encryptAES(distCode, clientAES);

    // Send RSA encrypted AES key and AES-encrypted district code
    const request = {
      clientKey: clientKey,
      district_Code: encDistCode
    };

    return this.http.post<any>(this.apiUrl, request);   

  }

}