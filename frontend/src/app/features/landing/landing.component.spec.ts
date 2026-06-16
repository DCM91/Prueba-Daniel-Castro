import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  let fixture: ComponentFixture<LandingComponent>;
  let httpMock: HttpTestingController;

  const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  const flushTranslations = (): void => {
    const esReq = httpMock.match('/assets/i18n/es.json');
    if (esReq.length) {
      esReq.forEach((c) => c.flush({
        app: { brand: 'FrameMatch', tagline: 'Conectando creatividad con oportunidades.' },
        common: {},
        roles: {},
        skill_categories: {},
        skill_levels: {},
        lang: { es: 'Español', en: 'English', selector_label: 'Idioma' },
        topbar: { go_home: 'Ir al inicio', logout: 'Cerrar sesión', back_to_catalog: 'Volver al catálogo' },
        landing: {
          eyebrow: 'Plataforma para creativos visuales',
          title: 'FrameMatch',
          tagline: 'Conectamos profesionales de {{strong1}} con clientes que necesitan contratar su talento para un proyecto.',
          tagline_disciplines: 'fotografía, vídeo y creación de contenido',
          cta_client: 'Necesito un profesional',
          cta_freelancer: 'Soy profesional',
          have_account: '¿Ya tienes cuenta?',
          login_link: 'Iniciar sesión',
          section_categories_title_before: 'Una plataforma,',
          section_categories_title_highlight: 'cuatro disciplinas',
          section_categories_subtitle: 'Encuentra al profesional creativo que necesitas, filtrando por categoría.',
          section_how_title: 'Cómo funciona',
          section_how_subtitle: 'De la idea al resultado en 3 pasos.',
          cat_photo_title: 'Fotografía',
          cat_photo_body: 'Retrato, producto, eventos, moda, inmobiliaria, gastronomía y más.',
          cat_video_title: 'Vídeo',
          cat_video_body: 'Corporativo, bodas, eventos, publicidad, redes sociales y producción con drone.',
          cat_edit_title: 'Edición',
          cat_edit_body: 'Edición de vídeo, color grading, motion graphics y post-producción.',
          cat_content_title: 'Creación de Contenido',
          cat_content_body: 'Copywriting, guion, redes sociales, pódcast, newsletter y locución.',
          how_step1_title: 'Regístrate',
          how_step1_body: 'Crea tu cuenta como cliente o profesional en menos de un minuto.',
          how_step2_title: 'Encuentra o muéstrate',
          how_step2_body: 'Los clientes filtran por categoría, ciudad y tarifa. Los profesionales completan su perfil.',
          how_step3_title: 'Conecta y crea',
          how_step3_body: 'Charla, acuerda el brief y empieza el proyecto.',
        },
        auth: {},
        home: {},
        freelancers: {},
        profile_editor: {},
        nav: {},
        footer: { copyright: '© 2026 FrameMatch · {{tagline}}' },
      }));
    }
    const enReq = httpMock.match('/assets/i18n/en.json');
    if (enReq.length) enReq.forEach((c) => c.flush({}));
  };

  beforeEach(async () => {
    localStorage.setItem('framematch_lang', 'es');
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LandingComponent);
    flushTranslations();
    await tick();
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the FrameMatch brand wordmark in the topbar', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('FrameMatch');
  });

  it('renders two CTAs (Necesito un profesional / Soy profesional)', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Necesito un profesional');
    expect(text).toContain('Soy profesional');
  });

  it('shows the "Cómo funciona" section with 3 steps', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Cómo funciona');
    expect(text).toContain('Regístrate');
    expect(text).toContain('Encuentra o muéstrate');
    expect(text).toContain('Conecta y crea');
  });

  it('shows the categories section with 4 categories', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Fotografía');
    expect(text).toContain('Vídeo');
    expect(text).toContain('Edición');
    expect(text).toContain('Creación de Contenido');
  });

  it('renders the hero tagline with the 3 disciplines', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('fotografía, vídeo y creación de contenido');
  });

  it('shows the login link in the topbar', () => {
    const loginLink = (fixture.nativeElement as HTMLElement).querySelector('.link-login');
    expect(loginLink?.textContent?.trim()).toBe('Iniciar sesión');
  });
});
