import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ChatMessage, Conversation } from '../types/auth.types';

interface MessageListResponse {
  data: ChatMessage[];
  has_more: boolean;
  earliest_at: string | null;
  latest_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);

  listConversations(): Observable<Conversation[]> {
    return this.http
      .get<{ data: Conversation[] }>('/api/conversations')
      .pipe(map((r) => r.data));
  }

  getConversation(id: number): Observable<Conversation> {
    return this.http
      .get<{ data: Conversation }>(`/api/conversations/${id}`)
      .pipe(map((r) => r.data));
  }

  ensureForBrief(briefId: number): Observable<Conversation> {
    return this.http
      .post<{ data: Conversation }>(`/api/briefs/${briefId}/conversation`, {})
      .pipe(map((r) => r.data));
  }

  listMessages(
    conversationId: number,
    options: { since?: string | null; limit?: number } = {},
  ): Observable<MessageListResponse> {
    let params = new HttpParams();
    if (options.since) {
      params = params.set('since', options.since);
    }
    if (options.limit !== undefined) {
      params = params.set('limit', String(options.limit));
    }
    return this.http.get<MessageListResponse>(
      `/api/conversations/${conversationId}/messages`,
      { params },
    );
  }

  sendMessage(conversationId: number, body: string): Observable<ChatMessage> {
    return this.http
      .post<{ data: ChatMessage }>(`/api/conversations/${conversationId}/messages`, { body })
      .pipe(map((r) => r.data));
  }

  markRead(conversationId: number): Observable<{ conversation_id: number; marked_count: number }> {
    return this.http
      .post<{ data: { conversation_id: number; marked_count: number } }>(
        `/api/conversations/${conversationId}/read`,
        {},
      )
      .pipe(map((r) => r.data));
  }

  getUnreadCount(): Observable<number> {
    return this.http
      .get<{ data: { unread_count: number } }>('/api/conversations/unread-count')
      .pipe(map((r) => r.data.unread_count));
  }
}
