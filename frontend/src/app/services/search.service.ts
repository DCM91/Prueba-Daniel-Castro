import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  WikipediaApiResponse,
  SaveHistoryResponse,
  HistoryResponse,
  DeleteHistoryResponse,
} from '../types/wiki.types';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private http = inject(HttpClient);

  searchWikipedia(term: string): Observable<WikipediaApiResponse> {
    const params = new HttpParams()
      .set('action', 'query')
      .set('list', 'search')
      .set('srsearch', term)
      .set('srlimit', '50')
      .set('format', 'json')
      .set('origin', '*');

    return this.http.get<WikipediaApiResponse>(
      'https://en.wikipedia.org/w/api.php',
      { params }
    );
  }

  saveToHistory(term: string, resultsCount: number): Observable<SaveHistoryResponse> {
    return this.http.post<SaveHistoryResponse>('/api/search/history', {
      term,
      results_count: resultsCount,
    });
  }

  getHistory(): Observable<HistoryResponse> {
    return this.http.get<HistoryResponse>('/api/search/history');
  }

  deleteHistoryItem(id: string): Observable<DeleteHistoryResponse> {
    return this.http.delete<DeleteHistoryResponse>(`/api/search/history/${id}`);
  }
}
