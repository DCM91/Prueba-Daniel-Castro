import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { provideLanguageServiceMock } from '../../../core/testing/language-service.mock';

import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { ChatMessage, Conversation, User } from '../../../core/types/auth.types';

import { ChatThreadComponent } from './chat-thread.component';

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
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 1,
    conversation_id: 1,
    sender_id: 1,
    body: 'Hola',
    read_at: null,
    created_at: '2026-06-18T10:00:00Z',
    sender: { id: 1, name: 'Test User', avatar_url: null },
    ...overrides,
  };
}

describe('ChatThreadComponent', () => {
  let fixture: ComponentFixture<ChatThreadComponent>;
  let component: ChatThreadComponent;
  let listMock: jest.Mock;
  let sendMock: jest.Mock;
  let markReadMock: jest.Mock;

  beforeEach(async () => {
    listMock = jest.fn().mockReturnValue(of({ data: [], has_more: false, earliest_at: null, latest_at: null }));
    sendMock = jest.fn().mockReturnValue(of(makeMessage()));
    markReadMock = jest.fn().mockReturnValue(of({ conversation_id: 1, marked_count: 0 }));

    await TestBed.configureTestingModule({
      imports: [ChatThreadComponent, TranslatePipe, DatePipe, ReactiveFormsModule],
      providers: [
        provideLanguageServiceMock('es', {
          chat: {
            back_to_list: '← Volver',
            context_brief: 'Proyecto: {{title}}',
            context_status: 'Estado: {{status}}',
            no_messages: 'Sin mensajes.',
            loading_messages: 'Cargando…',
            error_load_messages: 'No se pudieron cargar.',
            error_send: 'No se pudo enviar.',
            message_placeholder: 'Escribe…',
            send: 'Enviar',
            sending: 'Enviando…',
            sender_fallback: 'Interlocutor',
            you: 'Tú',
          },
        }),
        { provide: AuthService, useValue: { currentUser: () => makeUser(), getToken: () => null } },
        {
          provide: ChatService,
          useValue: {
            listMessages: listMock,
            sendMessage: sendMock,
            markRead: markReadMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatThreadComponent);
    component = fixture.componentInstance;
  });

  function renderWith(conversation: Conversation) {
    fixture.componentRef.setInput('conversation', conversation);
    fixture.detectChanges();
  }

  it('shows the empty state when there are no messages', () => {
    listMock.mockReturnValue(of({ data: [], has_more: false, earliest_at: null, latest_at: null }));
    renderWith(makeConversation());

    expect(fixture.nativeElement.textContent).toContain('Sin mensajes.');
  });

  it('renders messages with the right own/alien alignment', () => {
    listMock.mockReturnValue(of({
      data: [
        makeMessage({ id: 1, sender_id: 2, body: 'Hola cliente', sender: { id: 2, name: 'Lucia', avatar_url: null } }),
        makeMessage({ id: 2, sender_id: 1, body: 'Hola freelancer' }),
      ],
      has_more: false,
      earliest_at: '2026-06-18T10:00:00Z',
      latest_at: '2026-06-18T10:01:00Z',
    }));
    renderWith(makeConversation());

    const items = fixture.nativeElement.querySelectorAll('[data-own]');
    expect(items.length).toBe(2);
    expect(items[0].getAttribute('data-own')).toBe('false');
    expect(items[1].getAttribute('data-own')).toBe('true');
  });

  it('calls ChatService.sendMessage on submit', () => {
    listMock.mockReturnValue(of({ data: [], has_more: false, earliest_at: null, latest_at: null }));
    sendMock.mockReturnValue(of(makeMessage({ id: 99, body: 'Nuevo mensaje' })));
    renderWith(makeConversation());

    component.form.patchValue({ body: 'Nuevo mensaje' });
    component.send();

    expect(sendMock).toHaveBeenCalledWith(1, 'Nuevo mensaje');
  });

  it('does not send when the form is invalid (empty body)', () => {
    renderWith(makeConversation());
    component.send();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('surfaces error when listing messages fails', () => {
    listMock.mockReturnValue(throwError(() => ({ status: 500 })));
    renderWith(makeConversation());

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar');
  });

  it('surfaces error when sending fails', () => {
    sendMock.mockReturnValue(throwError(() => ({ status: 500 })));
    listMock.mockReturnValue(of({ data: [], has_more: false, earliest_at: null, latest_at: null }));
    renderWith(makeConversation());

    component.form.patchValue({ body: 'X' });
    component.send();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo enviar');
  });

  it('emits back event when back is called', () => {
    const backSpy = jest.fn();
    component.back.subscribe(backSpy);
    renderWith(makeConversation());

    component.back.emit();

    expect(backSpy).toHaveBeenCalled();
  });

  it('calls markRead on init', () => {
    renderWith(makeConversation());
    expect(markReadMock).toHaveBeenCalledWith(1);
  });

  it('appends incoming messages from polling', () => {
    listMock.mockReturnValueOnce(of({ data: [makeMessage({ id: 1 })], has_more: false, earliest_at: '2026-06-18T10:00:00Z', latest_at: '2026-06-18T10:00:00Z' }));
    renderWith(makeConversation());

    listMock.mockReturnValueOnce(of({ data: [makeMessage({ id: 2, body: 'Nuevo' })], has_more: false, earliest_at: '2026-06-18T10:00:00Z', latest_at: '2026-06-18T10:01:00Z' }));
    (component as unknown as { pollNew: (id: number) => void }).pollNew(1);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-test^="chat-message-"]');
    expect(items.length).toBe(2);
  });
});
