import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateGroupRequest,
  CreateSubGroupRequest,
  Group,
  GroupManagementData,
  GroupManagementResponse,
  SubGroup
} from '../models/group-subgroup';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly apiUrl = `${this.baseUrl}/Group`;

  getGroupManagement(): Observable<GroupManagementResponse<GroupManagementData>> {
    return this.http.get<GroupManagementResponse<GroupManagementData>>(`${this.apiUrl}/List`);
  }

  createGroup(payload: CreateGroupRequest): Observable<GroupManagementResponse<Group>> {
    return this.http.post<GroupManagementResponse<Group>>(`${this.apiUrl}/Create`, payload);
  }

  createSubGroup(payload: CreateSubGroupRequest): Observable<GroupManagementResponse<SubGroup>> {
    return this.http.post<GroupManagementResponse<SubGroup>>(`${this.apiUrl}/CreateSubGroup`, payload);
  }
}
