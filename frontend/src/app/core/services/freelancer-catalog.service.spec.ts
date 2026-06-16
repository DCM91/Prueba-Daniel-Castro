import { HttpClient, HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { FreelancerCatalogService } from './freelancer-catalog.service';
import {
  FreelancerCard,
  FreelancerDetail,
} from '../types/auth.types';

describe('FreelancerCatalogService', () => {
  let service: FreelancerCatalogService;
  let http: jest.Mocked<HttpClient>;

  beforeEach(() => {
    const httpMock = {
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpClient>;

    TestBed.configureTestingModule({
      providers: [
        FreelancerCatalogService,
        { provide: HttpClient, useValue: httpMock },
      ],
    });

    http = TestBed.inject(HttpClient) as jest.Mocked<HttpClient>;
    service = TestBed.inject(FreelancerCatalogService);
  });

  it('search() hits GET /api/freelancers without params when no filters', (done) => {
    const card: FreelancerCard = {
      id: 1, user_id: 7, display_name: 'Lucia', city: 'Madrid',
      hourly_rate: 50, is_available: true, top_skills: [], skills_count: 0, profile_completion: 50,
    };
    const response = { data: [card], meta: { current_page: 1, last_page: 1, per_page: 12, total: 1 } };
    http.get.mockReturnValueOnce(of(response));

    service.search().subscribe((res) => {
      expect(http.get).toHaveBeenCalledWith('/api/freelancers', { params: new HttpParams() });
      expect(res.data).toEqual([card]);
      expect(res.meta.total).toBe(1);
      done();
    });
  });

  it('search() sends all non-empty filters as query params', (done) => {
    const response = { data: [], meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 } };
    http.get.mockReturnValueOnce(of(response));

    service.search({ q: 'video', category: 'video', city: 'Madrid', max_rate: 80, page: 2 }).subscribe(() => {
      const call = http.get.mock.calls[0];
      expect(call[0]).toBe('/api/freelancers');
      const params = call[1].params as HttpParams;
      expect(params.get('q')).toBe('video');
      expect(params.get('category')).toBe('video');
      expect(params.get('city')).toBe('Madrid');
      expect(params.get('max_rate')).toBe('80');
      expect(params.get('page')).toBe('2');
      done();
    });
  });

  it('search() omits empty filters', (done) => {
    const response = { data: [], meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 } };
    http.get.mockReturnValueOnce(of(response));

    service.search({ city: 'Madrid' }).subscribe(() => {
      const params = http.get.mock.calls[0][1].params as HttpParams;
      expect(params.has('q')).toBe(false);
      expect(params.has('category')).toBe(false);
      expect(params.has('max_rate')).toBe(false);
      expect(params.has('page')).toBe(false);
      expect(params.get('city')).toBe('Madrid');
      done();
    });
  });

  it('getById() hits GET /api/freelancers/{id} and unwraps data', (done) => {
    const detail: FreelancerDetail = {
      id: 1, user_id: 7, display_name: 'Lucia', bio: 'Bio',
      city: 'Madrid', hourly_rate: 50, price_per_project: 300,
      is_available: true, created_at: '2026-06-11T00:00:00.000Z', skills: [],
    };
    http.get.mockReturnValueOnce(of({ data: detail }));

    service.getById(1).subscribe((res) => {
      expect(http.get).toHaveBeenCalledWith('/api/freelancers/1');
      expect(res).toEqual(detail);
      done();
    });
  });
});
