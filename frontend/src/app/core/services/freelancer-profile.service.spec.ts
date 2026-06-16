import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { AuthService } from './auth.service';
import { CloudinaryService } from './cloudinary.service';
import {
  CoverUploadPayload,
  FreelancerProfileService,
  PortfolioUploadPayload,
} from './freelancer-profile.service';

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, user_id: 7, display_name: 'L', bio: null, city: null,
    hourly_rate: null, price_per_project: null, is_available: true,
    cover_url: null, cover_urls: null, skills: [], portfolios: [],
    ...overrides,
  };
}

describe('FreelancerProfileService', () => {
  let service: FreelancerProfileService;
  let httpMock: HttpTestingController;
  let cloudinary: CloudinaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        FreelancerProfileService,
        {
          provide: CloudinaryService,
          useValue: { uploadImage: jest.fn() },
        },
        {
          provide: AuthService,
          useValue: { setFreelancerProfile: jest.fn() },
        },
      ],
    });
    service = TestBed.inject(FreelancerProfileService);
    httpMock = TestBed.inject(HttpTestingController);
    cloudinary = TestBed.inject(CloudinaryService) as unknown as { uploadImage: jest.Mock };
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('setCover PUTs to /api/freelancer/me/cover', () => {
    const payload: CoverUploadPayload = {
      public_id: 'framematch/covers/42', url: 'https://x/c.jpg', width: 1600, height: 320, format: 'jpg', bytes: 90000,
    };

    service.setCover(payload).subscribe((profile) => {
      expect(profile.cover_url).toBe('https://x/c.jpg');
    });

    const req = httpMock.expectOne('/api/freelancer/me/cover');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: makeProfile({ cover_url: 'https://x/c.jpg' }) });
  });

  it('removeCover DELETEs from /api/freelancer/me/cover', () => {
    service.removeCover().subscribe();

    const req = httpMock.expectOne('/api/freelancer/me/cover');
    expect(req.request.method).toBe('DELETE');
    req.flush({ data: makeProfile() });
  });

  it('listMyPortfolios GETs /api/freelancer/me/portfolios', () => {
    service.listMyPortfolios().subscribe((items) => {
      expect(items).toHaveLength(1);
    });

    const req = httpMock.expectOne('/api/freelancer/me/portfolios');
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [
        { id: 1, public_id: 'a/1', url: 'https://x/1', urls: { thumb: null, card: null, full: null }, position: 0 },
      ],
    });
  });

  it('addPortfolioItem POSTs to /api/freelancer/me/portfolios', () => {
    const payload: PortfolioUploadPayload = {
      public_id: 'a/1', url: 'https://x/1', width: 800, height: 600,
      format: 'jpg', bytes: 1000, title: 'Hola', description: null,
    };

    service.addPortfolioItem(payload).subscribe((item) => {
      expect(item.id).toBe(1);
    });

    const req = httpMock.expectOne('/api/freelancer/me/portfolios');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      data: { id: 1, public_id: 'a/1', url: 'https://x/1', urls: { thumb: null, card: null, full: null }, position: 0 },
    });
  });

  it('updatePortfolioItem PATCHes the item', () => {
    service.updatePortfolioItem(7, { title: 'Nuevo', description: null }).subscribe();

    const req = httpMock.expectOne('/api/freelancer/me/portfolios/7');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Nuevo', description: null });
    req.flush({
      data: { id: 7, public_id: 'a/7', url: 'x', urls: { thumb: null, card: null, full: null }, title: 'Nuevo', description: null, position: 0 },
    });
  });

  it('deletePortfolioItem DELETEs the item', () => {
    service.deletePortfolioItem(7).subscribe();

    const req = httpMock.expectOne('/api/freelancer/me/portfolios/7');
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });
  });

  it('reorderPortfolioItems POSTs ids', () => {
    service.reorderPortfolioItems([3, 1, 2]).subscribe((items) => {
      expect(items).toHaveLength(0);
    });

    const req = httpMock.expectOne('/api/freelancer/me/portfolios/reorder');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ids: [3, 1, 2] });
    req.flush({ data: [] });
  });
});
