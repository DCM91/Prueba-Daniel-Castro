import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FreelancerCardComponent } from './freelancer-card.component';
import { provideLanguageServiceMock } from '../../core/testing/language-service.mock';
import { FreelancerCard } from '../../core/types/auth.types';

describe('FreelancerCardComponent', () => {
  let component: FreelancerCardComponent;
  let fixture: ComponentFixture<FreelancerCardComponent>;

  const card: FreelancerCard = {
    id: 1,
    user_id: 7,
    display_name: 'Lucia Marin Foto',
    city: 'Madrid',
    hourly_rate: 55,
    is_available: true,
    top_skills: [
      { id: 1, name: 'Foto producto', slug: 'foto-producto', category: 'photo', level: 'senior' },
      { id: 2, name: 'Foto moda',    slug: 'foto-moda',     category: 'photo', level: 'mid' },
    ],
    skills_count: 2,
    profile_completion: 80,
  };

  const lang = provideLanguageServiceMock('es', {
    'freelancers.card': {
      initials_fallback: '?',
      available: 'Disponible',
      busy: 'Ocupado',
      rate_consult: 'Consultar',
      skills_empty: 'Sin skills registradas.',
      view_profile: 'Ver perfil →',
      aria_view_profile: "Ver perfil de {{name}}",
    },
    'skill_levels': { junior: 'Junior', mid: 'Mid', senior: 'Senior' },
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreelancerCardComponent],
      providers: [provideRouter([]), lang],
    }).compileComponents();

    fixture = TestBed.createComponent(FreelancerCardComponent);
    component = fixture.componentInstance;
    component.freelancer = card;
    fixture.detectChanges();
  });

  it('renders the display name and city', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Lucia Marin Foto');
    expect(text).toContain('Madrid');
  });

  it('shows the hourly rate with currency suffix', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('55€/h');
  });

  it('shows the "Disponible" pill when is_available is true', () => {
    const pill = (fixture.nativeElement as HTMLElement).querySelector('.status--on');
    expect(pill).toBeTruthy();
  });

  it('renders the top skills as chips', () => {
    const chips = (fixture.nativeElement as HTMLElement).querySelectorAll('.chip');
    expect(chips.length).toBe(2);
  });

  it('exposes initials computed from the display name', () => {
    expect(component.initials()).toBe('LM');
  });

  it('levelLabel maps levels to Spanish', () => {
    expect(component.levelLabel('junior')).toBe('Junior');
    expect(component.levelLabel('mid')).toBe('Mid');
    expect(component.levelLabel('senior')).toBe('Senior');
    expect(component.levelLabel(null)).toBe('');
  });

  it('hourlyRateLabel shows "Consultar" when hourly_rate is null', () => {
    component.freelancer = { ...card, hourly_rate: null };
    fixture.detectChanges();
    expect(component.hourlyRateLabel()).toBe('Consultar');
  });
});
