import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { CLOUDINARY_CONFIG } from '../config/cloudinary.config';
import { CloudinaryService, CloudinaryUploadResult } from './cloudinary.service';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let httpMock: HttpTestingController;
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        CloudinaryService,
      ],
    });
    service = TestBed.inject(CloudinaryService);
    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  function makeFile(name: string, type: string, sizeBytes: number): File {
    const blob = new Blob([new ArrayBuffer(sizeBytes)], { type });
    return new File([blob], name, { type });
  }

  it('uploads avatar to the avatar preset endpoint with FormData', (done) => {
    const file = makeFile('avatar.jpg', 'image/jpeg', 50_000);

    service.uploadImage(file, 'avatar').subscribe((result) => {
      expect(result.public_id).toBe('framematch/avatars/1-uuid');
      expect(result.width).toBe(800);
      done();
    });

    const req = httpMock.expectOne(CLOUDINARY_CONFIG.uploadEndpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const form = req.request.body as FormData;
    expect(form.get('upload_preset')).toBe('fm_av_upl');
    expect(form.get('file')).toBe(file);
    expect(form.has('public_id')).toBe(false);

    req.flush({
      public_id: 'framematch/avatars/1-uuid',
      url: 'http://res.cloudinary.com/dftvmkc1c/image/upload/v1/x.jpg',
      secure_url: 'https://res.cloudinary.com/dftvmkc1c/image/upload/v1/x.jpg',
      width: 800,
      height: 800,
      format: 'jpg',
      bytes: 50_000,
    } satisfies CloudinaryUploadResult);
  });

  it('sends deterministic public_id when provided', (done) => {
    const file = makeFile('avatar.png', 'image/png', 10_000);

    service
      .uploadImage(file, 'avatar', { deterministicId: 'framematch/avatars/42-fixed' })
      .subscribe(() => done());

    const req = httpMock.expectOne(CLOUDINARY_CONFIG.uploadEndpoint);
    const form = req.request.body as FormData;
    expect(form.get('public_id')).toBe('framematch/avatars/42-fixed');
    req.flush({
      public_id: 'framematch/avatars/42-fixed',
      url: '',
      secure_url: '',
      width: 200,
      height: 200,
      format: 'png',
      bytes: 10_000,
    });
  });

  it('throws synchronously when file exceeds max bytes', () => {
    const file = makeFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024);

    expect(() => service.uploadImage(file, 'avatar')).toThrow(/MB/);
  });

  it('throws synchronously when file type is not allowed', () => {
    const file = makeFile('doc.pdf', 'application/pdf', 1000);

    expect(() => service.uploadImage(file, 'avatar')).toThrow(/no está permitido/);
  });

  it('accepts gif for portfolio and brief types', () => {
    const file = makeFile('anim.gif', 'image/gif', 1000);

    expect(() => service.uploadImage(file, 'portfolio')).not.toThrow();
    expect(() => service.uploadImage(file, 'brief')).not.toThrow();
  });

  it('rejects gif for avatar', () => {
    const file = makeFile('anim.gif', 'image/gif', 1000);

    expect(() => service.uploadImage(file, 'avatar')).toThrow(/no está permitido/);
  });
});
