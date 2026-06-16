import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { FreelancerHomeComponent } from './freelancer-home.component';
import { AuthService } from '../../../core/services/auth.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import { FreelancerProfile, User } from '../../../core/types/auth.types';

describe('FreelancerHomeComponent', () => {
  let component: FreelancerHomeComponent;
  let fixture: ComponentFixture<FreelancerHomeComponent>;

  const makeUser = (profile: FreelancerProfile | null = null): User => ({
    id: 1,
    name: 'Luis Foto',
    email: 'luis@example.com',
    role: 'freelancer',
    created_at: null,
    freelancer_profile: profile,
  });

  const makeEmptyProfile = (): FreelancerProfile => ({
    id: 1,
    user_id: 1,
    display_name: null,
    bio: null,
    city: null,
    hourly_rate: null,
    price_per_project: null,
    is_available: true,
    skills: [],
  });

  const makeFullProfile = (overrides: Partial<FreelancerProfile> = {}): FreelancerProfile => ({
    id: 1,
    user_id: 1,
    display_name: 'Luis Foto Pro',
    bio: 'Fotógrafo especializado en producto y lifestyle.',
    city: 'Madrid',
    hourly_rate: 55,
    price_per_project: 350,
    is_available: true,
    skills: [
      { id: 1, name: 'Fotografía de producto', slug: 'fotografia-de-producto', category: 'photo' },
      { id: 2, name: 'Edición de video',      slug: 'edicion-de-video',      category: 'edit'  },
    ],
    ...overrides,
  });

  const langMock = (lang: 'es' | 'en', missing: Record<string, string>) => {
    return provideLanguageServiceMock(lang, {
      home: {
        freelancer: {
          greeting: 'Hola, {{name}}',
          completion_title: 'Completa tu perfil',
          completion_done: '¡Tu perfil está completo!',
          completion_missing: 'Te faltan: {{fields}}.',
          completion_progress: 'Estás al {{pct}}%.',
          edit_button: 'Completar perfil',
          preview_title: 'Tu escaparate',
          preview_subtitle: 'Así te ven los clientes.',
          preview_city_empty: 'Ciudad no definida',
          preview_bio_empty: 'Bio vacía',
          preview_skill_empty: 'Añade skills',
          hourly_rate_label: '{{rate}}€/h',
          price_per_project_label: '{{price}}€ / proyecto',
          tips_title: 'Consejos',
          tips_subtitle: 'Pequeñas mejoras, gran impacto.',
          missing,
          stats_visits_label: 'Visitas',
          stats_visits_hint: 'Esta semana',
          stats_contacts_label: 'Contactos',
          stats_contacts_hint: 'Mensajes recibidos',
          stats_jobs_label: 'Encargos',
          stats_jobs_hint: 'Total completado',
          stats_reviews_label: 'Reseñas',
          stats_reviews_hint: 'Valoración media',
          tip1_title: 'Sube tu portfolio',
          tip1_body: 'Más muestras = más contactos.',
          tip2_title: 'Responde rápido',
          tip2_body: 'Responde en 2h.',
          tip3_title: 'Define tu tarifa',
          tip3_body: 'Tarifas claras.',
          badge_label: 'Modo profesional',
        },
      },
      topbar: { logout: 'Cerrar sesión' },
      'freelancers.card.initials_fallback': '?',
    });
  };

  const configure = (user: User, lang: 'es' | 'en' = 'es') => {
    const userSignal = signal<User | null>(user);
    TestBed.configureTestingModule({
      imports: [FreelancerHomeComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: userSignal,
            logout: () => ({ subscribe: () => undefined }),
          },
        },
        langMock(lang, {
          profile: 'perfil',
          display_name: 'nombre artístico',
          bio: 'bio',
          city: 'ciudad',
          hourly_rate: 'tarifa por hora',
          price_per_project: 'precio por proyecto',
          skills: 'al menos una skill',
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FreelancerHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('greets the user with their name', () => {
    configure(makeUser(makeEmptyProfile()));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hola, Luis Foto');
  });

  describe('profileCompletion', () => {
    it('returns 5 when only is_available is true (the auto-true at registration)', () => {
      configure(makeUser(makeEmptyProfile()));
      expect(component.profileCompletion()).toBe(5);
    });

    it('returns 100 when every field is filled and at least one skill is present', () => {
      configure(makeUser(makeFullProfile()));
      expect(component.profileCompletion()).toBe(100);
    });

    it('returns a partial value matching the weighted sum', () => {
      configure(makeUser(makeFullProfile({
        display_name: 'Luis',
        bio: null,
        city: 'Madrid',
        hourly_rate: 50,
        price_per_project: null,
        skills: [],
      })));
      expect(component.profileCompletion()).toBe(45);
    });
  });

  describe('missingFields', () => {
    it('lists every empty field for a freshly-registered freelancer', () => {
      configure(makeUser(makeEmptyProfile()));
      const missing = component.missingFields();
      expect(missing).toEqual(expect.arrayContaining(['nombre artístico', 'bio', 'ciudad', 'tarifa por hora', 'precio por proyecto', 'al menos una skill']));
    });

    it('is empty when the profile is complete', () => {
      configure(makeUser(makeFullProfile()));
      expect(component.missingFields()).toEqual([]);
    });
  });

  it('exposes 4 stats and 3 tips', () => {
    configure(makeUser(makeEmptyProfile()));
    expect(component.stats.length).toBe(4);
    expect(component.tips.length).toBe(3);
  });
});
