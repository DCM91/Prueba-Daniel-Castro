import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  FreelancerCard,
  FreelancerDetail,
  FreelancerSearchFilters,
  Paginated,
} from '../types/auth.types';

interface CatalogResponse {
  data: FreelancerCard[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface DetailEnvelope<T> { data: T }

@Injectable({ providedIn: 'root' })
export class FreelancerCatalogService {
  private readonly http = inject(HttpClient);

  search(filters: FreelancerSearchFilters = {}): Observable<Paginated<FreelancerCard>> {
    let params = new HttpParams();
    if (filters.q)         params = params.set('q', filters.q);
    if (filters.category)  params = params.set('category', filters.category);
    if (filters.city)      params = params.set('city', filters.city);
    if (filters.max_rate !== undefined && filters.max_rate !== null) {
      params = params.set('max_rate', String(filters.max_rate));
    }
    if (filters.page)      params = params.set('page', String(filters.page));
    if (filters.sort)      params = params.set('sort', filters.sort);

    return this.http
      .get<CatalogResponse>('/api/freelancers', { params })
      .pipe(map((response) => ({ data: response.data, meta: response.meta })));
  }

  getById(id: number): Observable<FreelancerDetail> {
    return this.http
      .get<DetailEnvelope<FreelancerDetail>>(`/api/freelancers/${id}`)
      .pipe(map((response) => response.data));
  }
}
