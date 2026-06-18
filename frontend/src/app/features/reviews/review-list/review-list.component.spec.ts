import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';

import { ReviewsService } from '../../../core/services/reviews.service';
import { Review, User } from '../../../core/types/auth.types';

import { ReviewListComponent } from './review-list.component';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1, name: 'Ana', email: 'a@e.com', role: 'client', created_at: '2026-01-01T00:00:00Z',
    avatar_url: null, avatar_urls: null, ...overrides,
  };
}

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 1, brief_id: 1, reviewer_id: 2, reviewee_id: 1, rating: 5,
    comment: 'Genial trabajo', created_at: '2026-06-18T10:00:00Z', updated_at: null,
    reviewer: { id: 2, name: 'Lucia', avatar_url: null },
    reviewee: { id: 1, name: 'Ana', avatar_url: null },
    ...overrides,
  };
}

describe('ReviewListComponent', () => {
  let fixture: ComponentFixture<ReviewListComponent>;
  let component: ReviewListComponent;
  let listForUserMock: jest.Mock;
  let listForBriefMock: jest.Mock;

  beforeEach(async () => {
    listForUserMock = jest.fn().mockReturnValue(of([]));
    listForBriefMock = jest.fn().mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ReviewListComponent, TranslatePipe, DatePipe],
      providers: [
        provideLanguageServiceMock('es', {
          reviews: {
            section_title: 'Reseñas',
            title: 'Reseñas',
            empty_for_user: 'Sin reseñas.',
            empty_for_brief: 'Sin reseñas del proyecto.',
            error_load: 'Error al cargar reseñas.',
            anonymous_reviewer: 'Anónimo',
          },
          'briefs.detail.description': 'Proyecto',
          'rating.aria_label': 'Puntuación: {{n}} de 5',
        }),
        {
          provide: ReviewsService,
          useValue: {
            listForUser: listForUserMock,
            listForBrief: listForBriefMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewListComponent);
    component = fixture.componentInstance;
  });

  it('shows the empty state when there are no reviews', () => {
    listForUserMock.mockReturnValue(of([]));
    fixture.componentRef.setInput('userId', 1);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin reseñas.');
  });

  it('renders a row per review with the reviewer name and rating', () => {
    listForUserMock.mockReturnValue(of([makeReview()]));
    fixture.componentRef.setInput('userId', 1);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-test^="review-item-"]');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Lucia');
    expect(items[0].textContent).toContain('Genial trabajo');
  });

  it('surfaces error when listing fails', () => {
    listForUserMock.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.componentRef.setInput('userId', 1);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Error al cargar reseñas.');
  });

  it('uses the brief endpoint when briefId is set', () => {
    listForBriefMock.mockReturnValue(of([makeReview()]));
    fixture.componentRef.setInput('briefId', 5);
    fixture.detectChanges();

    expect(listForBriefMock).toHaveBeenCalledWith(5);
  });
});
