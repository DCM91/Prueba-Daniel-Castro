import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  FreelancerProfile,
  FreelancerSkillInput,
  PortfolioItem,
  Skill,
} from '../types/auth.types';

interface ApiEnvelope<T> { data: T }

export interface CoverUploadPayload {
  public_id: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface PortfolioUploadPayload {
  public_id: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  title?: string | null;
  description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FreelancerProfileService {
  private readonly http = inject(HttpClient);

  getSkills(): Observable<Skill[]> {
    return this.http
      .get<ApiEnvelope<Skill[]>>('/api/skills')
      .pipe(map((response) => response.data));
  }

  getMyProfile(): Observable<FreelancerProfile> {
    return this.http
      .get<ApiEnvelope<FreelancerProfile>>('/api/freelancer/me')
      .pipe(map((response) => response.data));
  }

  updateMyProfile(input: Partial<FreelancerProfile>): Observable<FreelancerProfile> {
    return this.http
      .put<ApiEnvelope<FreelancerProfile>>('/api/freelancer/me', input)
      .pipe(map((response) => response.data));
  }

  syncMySkills(skills: FreelancerSkillInput[]): Observable<FreelancerProfile> {
    return this.http
      .put<ApiEnvelope<FreelancerProfile>>('/api/freelancer/me/skills', { skills })
      .pipe(map((response) => response.data));
  }

  setCover(payload: CoverUploadPayload): Observable<FreelancerProfile> {
    return this.http
      .put<ApiEnvelope<FreelancerProfile>>('/api/freelancer/me/cover', payload)
      .pipe(map((response) => response.data));
  }

  removeCover(): Observable<FreelancerProfile> {
    return this.http
      .delete<ApiEnvelope<FreelancerProfile>>('/api/freelancer/me/cover')
      .pipe(map((response) => response.data));
  }

  listMyPortfolios(): Observable<PortfolioItem[]> {
    return this.http
      .get<ApiEnvelope<PortfolioItem[]>>('/api/freelancer/me/portfolios')
      .pipe(map((response) => response.data));
  }

  addPortfolioItem(payload: PortfolioUploadPayload): Observable<PortfolioItem> {
    return this.http
      .post<ApiEnvelope<PortfolioItem>>('/api/freelancer/me/portfolios', payload)
      .pipe(map((response) => response.data));
  }

  updatePortfolioItem(
    id: number,
    input: { title?: string | null; description?: string | null; position?: number },
  ): Observable<PortfolioItem> {
    return this.http
      .patch<ApiEnvelope<PortfolioItem>>(`/api/freelancer/me/portfolios/${id}`, input)
      .pipe(map((response) => response.data));
  }

  deletePortfolioItem(id: number): Observable<{ message: string }> {
    return this.http
      .delete<{ message: string }>(`/api/freelancer/me/portfolios/${id}`)
      .pipe(map((response) => response));
  }

  reorderPortfolioItems(ids: number[]): Observable<PortfolioItem[]> {
    return this.http
      .post<ApiEnvelope<PortfolioItem[]>>('/api/freelancer/me/portfolios/reorder', { ids })
      .pipe(map((response) => response.data));
  }
}
