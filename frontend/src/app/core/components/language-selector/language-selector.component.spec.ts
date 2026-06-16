import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { LanguageSelectorComponent } from './language-selector.component';
import { AppLanguage, LanguageService } from '../../../core/services/language.service';

describe('LanguageSelectorComponent', () => {
  let fixture: ComponentFixture<LanguageSelectorComponent>;
  let setLanguageMock: jest.Mock;
  let languageSignal: ReturnType<typeof signal<AppLanguage>>;

  const configure = (initial: AppLanguage = 'es') => {
    languageSignal = signal<AppLanguage>(initial);
    setLanguageMock = jest.fn((code: AppLanguage) => languageSignal.set(code));

    TestBed.configureTestingModule({
      imports: [LanguageSelectorComponent],
      providers: [
        {
          provide: LanguageService,
          useValue: {
            language: languageSignal,
            supported: [
              { code: 'es', label: 'Español' },
              { code: 'en', label: 'English' },
            ],
            setLanguage: setLanguageMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSelectorComponent);
    fixture.detectChanges();
  };

  it('shows the current language code on the trigger', () => {
    configure('es');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('ES');
  });

  it('opens the menu when the trigger is clicked and lists both languages', () => {
    configure('es');
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.trigger');
    trigger?.click();
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.menu-item');
    expect(items.length).toBe(2);
  });

  it('calls setLanguage with the selected code when an option is clicked', () => {
    configure('es');
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.trigger');
    trigger?.click();
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.menu-item');
    items[1].click();
    expect(setLanguageMock).toHaveBeenCalledWith('en');
  });
});
