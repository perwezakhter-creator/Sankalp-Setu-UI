import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CryptoService } from './crypto.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MasterService {

  private http = inject(HttpClient);
  private cryptoService = inject(CryptoService);
  private baseUrl = environment.apiUrl;

  private getClientKey(): string {
    const clientAES = localStorage.getItem('clientAES') || '';
    if (!clientAES) {
      throw new Error('Client AES key not found.');
    }
    return this.cryptoService.encryptRSA(clientAES);
  }

  private encryptField(value: string): string {
    const clientAES = localStorage.getItem('clientAES') || '';
    return this.cryptoService.encryptAES(value, clientAES);
  }

  // ----------------------------------------------------------
  // Location Details
  // ----------------------------------------------------------

  getPanchayatList(blockCode: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Master/GetPanchayatList`, {
      clientKey: this.getClientKey(),
      blockCode: this.encryptField(blockCode),
    });
  }

  getVillageList(panchayatCode: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Master/GetVillageList`, {
      clientKey: this.getClientKey(),
      panchayatCode: this.encryptField(panchayatCode),
    });
  }

  getWardList(panchayatCode: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Master/GetWardList`, {
      clientKey: this.getClientKey(),
      panchayatCode: this.encryptField(panchayatCode),
    });
  }

  // ----------------------------------------------------------
  // Demographics
  // ----------------------------------------------------------

  getGenderList(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Master/GetGenderList`, {
      clientKey: this.getClientKey(),
    });
  }

  getAgeGroupList(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Master/GetAgeGroupList`, {
      clientKey: this.getClientKey(),
    });
  }

  getCategoryList(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Master/GetCategoryList`, {
      clientKey: this.getClientKey(),
    });
  }

  getQualificationList(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Master/GetQualificationList`, {
      clientKey: this.getClientKey(),
    });
  }

  getOccupationList(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Master/GetOccupationList`, {
      clientKey: this.getClientKey(),
    });
  }

  getInterestList(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Master/GetInterestList`, {
      clientKey: this.getClientKey(),
    });
  }
}