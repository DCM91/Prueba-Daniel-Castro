import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { provideLanguageServiceMock } from '../../testing/language-service.mock';

import { AuthService } from '../../services/auth.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { UserService } from '../../services/user.service';
import { User } from '../../types/auth.types';

import { AvatarUploaderComponent } from './avatar-uploader.component';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    name: 'Lucia Marin',
    email: 'lucia@example.com',
    role: 'freelancer',
    created_at: '2026-06-14T00:00:00+00:00',
    avatar_url: null,
    avatar_urls: null,
    ...overrides,
  };
}

describe('AvatarUploaderComponent', () => {
  let fixture: ComponentFixture<AvatarUploaderComponent>;
  let component: AvatarUploaderComponent;
  let httpMock: HttpTestingController;
  let cloudinaryUploadMock: jest.Mock;

  beforeEach(async () => {
    cloudinaryUploadMock = jest.fn().mockReturnValue(
      of({
        public_id: 'framematch/avatars/7-uuid',
        url: 'http://x',
        secure_url: 'https://res.cloudinary.com/demo/avatar.jpg',
        width: 800,
        height: 800,
        format: 'jpg',
        bytes: 5000,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [AvatarUploaderComponent, TranslatePipe],
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        provideLanguageServiceMock('es', {
          uploader: {
            drop_zone: 'Arrastra una imagen aquí o haz clic para seleccionar',
            uploading: 'Subiendo…',
            success: 'Imagen subida',
            error_format: 'Formato no soportado',
            error_network: 'Error de red',
            error_unknown: 'No se pudo subir la imagen',
          },
          avatar: {
            remove_cta: 'Eliminar foto',
            preview_alt: 'Foto de {{name}}',
            fallback_alt: 'Iniciales de {{name}}',
          },
        }),
        {
          provide: AuthService,
          useValue: { setCurrentUser: jest.fn() },
        },
        {
          provide: CloudinaryService,
          useValue: { uploadImage: cloudinaryUploadMock },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarUploaderComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function makeImageFile(name = 'avatar.jpg', type = 'image/jpeg'): File {
    return new File([new Blob([new Uint8Array(2048)], { type })], name, { type });
  }

  it('renders initials when no current avatar', () => {
    fixture.componentRef.setInput('userName', 'Lucia Marin');
    fixture.detectChanges();

    const fallback = fixture.nativeElement.querySelector('.avatar-fallback') as HTMLElement;
    expect(fallback?.textContent?.trim()).toBe('LM');
  });

  it('renders the existing avatar image when currentAvatarUrl is set', () => {
    fixture.componentRef.setInput('currentAvatarUrl', 'https://res.cloudinary.com/demo/x.jpg');
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img.avatar-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toBe('https://res.cloudinary.com/demo/x.jpg');
  });

  it('uses the md-sized URL from currentAvatarUrls when provided', () => {
    fixture.componentRef.setInput('currentAvatarUrls', {
      xs: 'https://res.cloudinary.com/demo/xs.jpg',
      sm: 'https://res.cloudinary.com/demo/sm.jpg',
      md: 'https://res.cloudinary.com/demo/md.jpg',
      lg: 'https://res.cloudinary.com/demo/lg.jpg',
      xxl: 'https://res.cloudinary.com/demo/xxl.jpg',
    });
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img.avatar-img') as HTMLImageElement;
    expect(img.src).toBe('https://res.cloudinary.com/demo/md.jpg');
  });

  it('does not call cloudinary upload if no file is provided', () => {
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    const fakeEvent = {
      target: { files: [], value: '' },
    } as unknown as Event;
    component.onFileSelected(fakeEvent);

    expect(cloudinaryUploadMock).not.toHaveBeenCalled();
  });

  it('shows the remove button only when there is a current avatar', () => {
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.remove-btn')).toBeNull();

    fixture.componentRef.setInput('currentAvatarUrl', 'https://res.cloudinary.com/demo/x.jpg');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.remove-btn')).toBeTruthy();
  });

  it('removes avatar via DELETE when remove is called', () => {
    fixture.componentRef.setInput('currentAvatarUrl', 'https://res.cloudinary.com/demo/x.jpg');
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    component.remove();

    const req = httpMock.expectOne('/api/me/avatar');
    expect(req.request.method).toBe('DELETE');
    const updatedUser = makeUser({ avatar_url: null, avatar_urls: null });
    req.flush({ data: updatedUser });
  });

  it('shows success status after backend confirms removal', () => {
    fixture.componentRef.setInput('currentAvatarUrl', 'https://res.cloudinary.com/demo/x.jpg');
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    component.remove();
    const req = httpMock.expectOne('/api/me/avatar');
    req.flush({ data: makeUser({ avatar_url: null, avatar_urls: null }) });

    expect(component.status().kind).toBe('success');
  });

  it('does not start another upload while one is in progress', () => {
    fixture.componentRef.setInput('currentAvatarUrl', 'https://res.cloudinary.com/demo/x.jpg');
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    component.remove();

    // While the DELETE is in flight, calling remove() again should be a no-op.
    component.remove();

    const req = httpMock.expectOne('/api/me/avatar');
    expect(req.request.method).toBe('DELETE');
    req.flush({ data: makeUser({ avatar_url: null }) });
  });

  it('uploads file to Cloudinary then POSTs to backend when onFileSelected is called', async () => {
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    const fakeEvent = {
      target: { files: [makeImageFile()], value: '' },
    } as unknown as Event;
    component.onFileSelected(fakeEvent);

    // Wait for the async handleFile chain (FileReader + cloudinary + backend POST).
    await new Promise((r) => setTimeout(r, 10));

    expect(cloudinaryUploadMock).toHaveBeenCalled();
    const backendReq = httpMock.expectOne('/api/me/avatar');
    expect(backendReq.request.method).toBe('POST');
    expect(backendReq.request.body).toMatchObject({
      public_id: 'framematch/avatars/7-uuid',
      format: 'jpg',
    });
  });

  it('emits avatarUpdated with the new user after successful upload', async () => {
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    const emitSpy = jest.fn();
    component.avatarUpdated.subscribe(emitSpy);

    const fakeEvent = {
      target: { files: [makeImageFile()], value: '' },
    } as unknown as Event;
    component.onFileSelected(fakeEvent);
    await new Promise((r) => setTimeout(r, 10));

    const backendReq = httpMock.expectOne('/api/me/avatar');
    const updatedUser = makeUser({
      avatar_url: 'https://res.cloudinary.com/demo/avatar.jpg',
    });
    backendReq.flush({ data: updatedUser });

    expect(emitSpy).toHaveBeenCalledWith(updatedUser);
  });

  it('shows error status when backend returns 403', async () => {
    fixture.componentRef.setInput('userName', 'Lucia');
    fixture.detectChanges();

    const fakeEvent = {
      target: { files: [makeImageFile()], value: '' },
    } as unknown as Event;
    component.onFileSelected(fakeEvent);
    await new Promise((r) => setTimeout(r, 10));

    const backendReq = httpMock.expectOne('/api/me/avatar');
    backendReq.flush(
      { message: 'El recurso no pertenece a la carpeta esperada.' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(component.status().kind).toBe('error');
  });
});
