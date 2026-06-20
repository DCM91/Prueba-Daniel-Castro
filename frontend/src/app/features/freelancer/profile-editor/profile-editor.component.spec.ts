import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';

import { ProfileEditorComponent } from './profile-editor.component';
import { AuthService } from '../../../core/services/auth.service';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';
import {
  FreelancerProfile,
  Skill,
  User,
} from '../../../core/types/auth.types';

describe('ProfileEditorComponent', () => {
  let component: ProfileEditorComponent;
  let fixture: ComponentFixture<ProfileEditorComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  const skills: Skill[] = [
    { id: 1, name: 'Foto producto', slug: 'foto-producto', category: 'photo' },
    { id: 2, name: 'Video corporativo', slug: 'video-corporativo', category: 'video' },
    { id: 3, name: 'Color grading', slug: 'color-grading', category: 'edit' },
  ];

  const emptyProfile: FreelancerProfile = {
    id: 10,
    user_id: 7,
    display_name: null,
    bio: null,
    city: null,
    hourly_rate: null,
    price_per_project: null,
    is_available: true,
    skills: [],
  };

  const currentUser: User = {
    id: 7,
    name: 'Luis',
    email: 'luis@example.com',
    phone: '+34 600 000 000',
    city: 'Madrid',
    role: 'freelancer',
    created_at: '2026-06-11T08:00:00.000Z',
    freelancer_profile: emptyProfile,
  };

  const currentUserSignal = signal<User | null>(currentUser);
  const setFreelancerProfile = jest.fn();
  const setCurrentUser = jest.fn();

  beforeEach(async () => {
    setFreelancerProfile.mockClear();
    setCurrentUser.mockClear();

    await TestBed.configureTestingModule({
      imports: [ProfileEditorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: {
            currentUser: currentUserSignal,
            setFreelancerProfile,
            setCurrentUser,
          } },
        provideLanguageServiceMock('es', {
          profile_editor: { error_save: 'No se pudo guardar el perfil.' },
          account: {
            section_avatar: 'Foto de perfil',
            section_avatar_hint: 'Sube tu foto.',
            section_personal: 'Datos personales',
            section_personal_hint: 'Tu nombre y email.',
            label_name: 'Nombre',
            label_email: 'Email',
            label_phone: 'Teléfono',
            label_city: 'Ciudad',
            placeholder_phone: '+34 600 000 000',
            placeholder_city: 'Madrid',
            success: 'Datos actualizados.',
          },
          topbar: { back_to_home: '← Inicio' },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialLoad(): void {
    const skillsReq = httpMock.expectOne('/api/skills');
    expect(skillsReq.request.method).toBe('GET');
    skillsReq.flush({ data: skills });

    const profileReq = httpMock.expectOne('/api/freelancer/me');
    expect(profileReq.request.method).toBe('GET');
    profileReq.flush({ data: emptyProfile });
    fixture.detectChanges();
  }

  it('loads skills and profile on init, prefills personal + professional forms', () => {
    flushInitialLoad();

    expect(component.loading()).toBe(false);
    expect(component.availableSkills().length).toBe(3);
    expect(component.basicForm.controls.display_name.value).toBe('');
    expect(component.personalForm.controls.name.value).toBe('Luis');
    expect(component.personalForm.controls.email.value).toBe('luis@example.com');
    expect(component.personalForm.controls.phone.value).toBe('+34 600 000 000');
    expect(component.personalForm.controls.city.value).toBe('Madrid');
  });

  it('marks forms as touched when submitting all-invalid; nothing is sent', () => {
    flushInitialLoad();

    component.personalForm.patchValue({ name: '' });
    component.basicForm.patchValue({ hourly_rate: -5 });
    component.submit();

    expect(component.personalForm.touched).toBe(true);
    expect(component.basicForm.touched).toBe(true);
    expect(component.submitting()).toBe(false);
  });

  it('submits personal + professional in a single forkJoin: PUT /me, PUT /freelancer/me, PUT /freelancer/me/skills', () => {
    flushInitialLoad();

    component.basicForm.patchValue({
      display_name: 'Luis Foto Pro',
      city: 'Madrid',
      hourly_rate: 60,
      price_per_project: 450,
    });
    component.toggleSkill(skills[0]);
    component.toggleSkill(skills[1]);
    component.skillsForm.at(0).patchValue({ level: 'senior', years_experience: 5 });
    component.skillsForm.at(1).patchValue({ level: 'junior', years_experience: 1 });

    component.submit();

    const personalReq = httpMock.expectOne('/api/me');
    expect(personalReq.request.method).toBe('PUT');
    expect(personalReq.request.body).toEqual({
      name: 'Luis',
      email: 'luis@example.com',
      phone: '+34 600 000 000',
      city: 'Madrid',
    });
    personalReq.flush({ data: currentUser });

    const updateReq = httpMock.expectOne('/api/freelancer/me');
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual({
      display_name: 'Luis Foto Pro',
      bio: null,
      city: 'Madrid',
      hourly_rate: 60,
      price_per_project: 450,
      is_available: true,
    });
    updateReq.flush({ data: { ...emptyProfile, display_name: 'Luis Foto Pro', city: 'Madrid' } });

    const skillsReq = httpMock.expectOne('/api/freelancer/me/skills');
    expect(skillsReq.request.method).toBe('PUT');
    expect(skillsReq.request.body).toEqual({
      skills: [
        { skill_id: 1, level: 'senior', years_experience: 5 },
        { skill_id: 2, level: 'junior', years_experience: 1 },
      ],
    });
    skillsReq.flush({ data: { ...emptyProfile, skills: [] } });

    expect(setCurrentUser).toHaveBeenCalledWith(currentUser);
    expect(setFreelancerProfile).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/home/freelancer']);
    expect(component.submitting()).toBe(false);
  });

  it('submits only personal when professional form is invalid (no PUT /freelancer/me)', () => {
    flushInitialLoad();

    component.basicForm.patchValue({ hourly_rate: -5 });
    component.personalForm.patchValue({ name: 'Luis Editado' });

    component.submit();

    const personalReq = httpMock.expectOne('/api/me');
    expect(personalReq.request.body).toEqual({
      name: 'Luis Editado',
      email: 'luis@example.com',
      phone: '+34 600 000 000',
      city: 'Madrid',
    });
    personalReq.flush({ data: { ...currentUser, name: 'Luis Editado' } });

    expect(setCurrentUser).toHaveBeenCalled();
    expect(setFreelancerProfile).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.personalSaved()).toBe(true);
    expect(component.submitting()).toBe(false);
  });

  it('shows personal server error and stops submitting when only personal is sent', () => {
    flushInitialLoad();

    component.basicForm.patchValue({ hourly_rate: -5 });

    component.submit();

    const personalReq = httpMock.expectOne('/api/me');
    personalReq.flush(
      { message: 'El email ya está en uso.', errors: { email: ['Email duplicado'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(component.errorMessage()).toBe('El email ya está en uso.');
    const err = component.errorForPersonal('email');
    expect(err).not.toBeNull();
    expect(err?.key).toBe('Email duplicado');
    expect(component.submitting()).toBe(false);
  });

  it('shows server error message on 422 professional and stops submitting', () => {
    flushInitialLoad();

    component.basicForm.patchValue({ display_name: 'Luis Foto Pro' });
    component.submit();

    httpMock.expectOne('/api/me').flush({ data: currentUser });

    const updateReq = httpMock.expectOne('/api/freelancer/me');
    updateReq.flush(
      { message: 'La bio no puede tener más de 1000 caracteres.', errors: { bio: ['demasiado larga'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(component.errorMessage()).toBe('La bio no puede tener más de 1000 caracteres.');
    expect(component.errorFor('bio')).toBe('demasiado larga');
    expect(component.submitting()).toBe(false);
  });
});
