import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';

import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { Conversation, User } from '../../../core/types/auth.types';

import { ChatListComponent } from './chat-list.component';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'client',
    created_at: '2026-01-01T00:00:00Z',
    avatar_url: null,
    avatar_urls: null,
    ...overrides,
  };
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 1,
    brief_id: 1,
    client_id: 1,
    freelancer_id: 2,
    last_message_at: '2026-06-18T10:00:00Z',
    created_at: '2026-06-18T09:00:00Z',
    unread_count: 0,
    brief: { id: 1, title: 'Mi proyecto', status: 'assigned' },
    client: { id: 1, name: 'Test User', avatar_url: null },
    freelancer: { id: 2, name: 'Lucia Marin', avatar_url: null },
    latest_message: null,
    ...overrides,
  };
}

describe('ChatListComponent', () => {
  let fixture: ComponentFixture<ChatListComponent>;
  let component: ChatListComponent;
  let listMock: jest.Mock;
  let ensureMock: jest.Mock;

  beforeEach(async () => {
    listMock = jest.fn().mockReturnValue(of([]));
    ensureMock = jest.fn().mockReturnValue(of(makeConversation()));

    await TestBed.configureTestingModule({
      imports: [ChatListComponent, TranslatePipe, DatePipe],
      providers: [
        provideLanguageServiceMock('es', {
          chat: {
            list_title: 'Conversaciones',
            list_subtitle: 'Chats ligados a tus proyectos.',
            empty_list: 'Sin conversaciones.',
            empty_state_title: 'Aún no hay conversaciones',
            empty_state_body: 'Empieza aceptando una propuesta o enviando la tuya.',
            loading_list: 'Cargando…',
            error_load_list: 'No se pudieron cargar.',
            unread_badge: '{{n}}',
            with_label: 'con {{name}}',
            context_brief: 'Sobre el proyecto: {{title}}',
            no_messages_yet_short: 'Sin mensajes aún',
            open_chat: 'Abrir conversación',
          },
        }),
        {
          provide: AuthService,
          useValue: { currentUser: () => makeUser(), getToken: () => null },
        },
        {
          provide: ChatService,
          useValue: {
            listConversations: listMock,
            ensureForBrief: ensureMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatListComponent);
    component = fixture.componentInstance;
  });

  it('shows the empty state when there are no conversations', () => {
    listMock.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aún no hay conversaciones');
  });

  it('renders the illustrated empty state with icon, title and body when no conversations', () => {
    listMock.mockReturnValue(of([]));
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('[data-test="empty-state"]');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.querySelector('svg')).toBeTruthy();
    expect(emptyState?.querySelector('.chat-list__empty-title')?.textContent).toContain('Aún no hay conversaciones');
    expect(emptyState?.querySelector('.chat-list__empty-body')?.textContent).toContain('Empieza aceptando');
  });

  it('renders a row per conversation with the counterpart name', () => {
    listMock.mockReturnValue(of([makeConversation()]));
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-unread]');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Lucia Marin');
    expect(items[0].textContent).toContain('Mi proyecto');
  });

  it('surfaces error when listing fails', () => {
    listMock.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar');
  });

  it('emits open event when a conversation is selected', () => {
    const conv = makeConversation();
    listMock.mockReturnValue(of([conv]));
    const openSpy = jest.fn();
    component.open.subscribe(openSpy);
    fixture.detectChanges();

    component.selectConversation(conv);

    expect(openSpy).toHaveBeenCalledWith(conv);
  });

  it('ensureAndOpen() calls ChatService.ensureForBrief() and emits the conversation', () => {
    const conv = makeConversation();
    ensureMock.mockReturnValue(of(conv));
    const openSpy = jest.fn();
    component.open.subscribe(openSpy);

    component.ensureAndOpen(5);

    expect(ensureMock).toHaveBeenCalledWith(5);
    expect(openSpy).toHaveBeenCalledWith(conv);
  });

  it('shows the unread badge when unread_count > 0', () => {
    listMock.mockReturnValue(of([makeConversation({ unread_count: 3 })]));
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('[data-unread="true"]');
    expect(item).toBeTruthy();
    const badge = item.querySelector('.chat-list__badge');
    expect(badge?.textContent).toContain('3');
  });

  it('exposes a translated aria-label on the unread badge (not hardcoded "unread")', () => {
    listMock.mockReturnValue(of([makeConversation({ unread_count: 5 })]));
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.chat-list__badge');
    const aria = badge?.getAttribute('aria-label');
    expect(aria).toBeTruthy();
    expect(aria).not.toBe('unread');
  });
});
