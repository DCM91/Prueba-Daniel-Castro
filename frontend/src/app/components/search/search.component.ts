import { Component, signal, inject, computed, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../services/search.service';
import { WikiSearchResult, HistoryItem } from '../../types/wiki.types';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent implements OnDestroy {
  private searchService = inject(SearchService);

  private readonly pageSize = 10;
  private readonly minSearchInterval = 2000;
  private lastSearchTime = 0;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  searchTerm = signal('');
  isSearching = signal(false);
  errorMessage = signal<string | null>(null);
  rateLimitCountdown = signal(0);

  results = signal<WikiSearchResult[]>([]);
  totalHits = signal(0);
  currentPage = signal(1);

  history = signal<HistoryItem[]>([]);

  showHistory = signal(false);

  readonly hasResults = computed(() => this.results().length > 0);
  readonly hasHistory = computed(() => this.history().length > 0);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.results().length / this.pageSize)));

  readonly paginatedResults = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.results().slice(start, start + this.pageSize);
  });

  readonly showPagination = computed(() => this.totalPages() > 1);

  readonly pageStart = computed(() => {
    if (this.results().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  readonly pageEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.results().length),
  );

  constructor() {
    this.loadHistory();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  loadHistory(): void {
    this.searchService.getHistory().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.history.set(response.data);
        }
      },
      error: (err) => console.error('Failed to load history:', err),
    });
  }

  onSearch(): void {
    const now = Date.now();
    if (this.isSearching() || now - this.lastSearchTime < this.minSearchInterval) {
      return;
    }

    const term = this.searchTerm().trim();

    if (!term) {
      this.errorMessage.set('Please enter a search term');
      return;
    }

    this.lastSearchTime = now;
    this.errorMessage.set(null);
    this.rateLimitCountdown.set(0);
    this.isSearching.set(true);
    this.results.set([]);
    this.totalHits.set(0);
    this.currentPage.set(1);

    this.searchService.searchWikipedia(term).subscribe({
      next: (response) => {
        this.isSearching.set(false);

        if (response.error) {
          this.errorMessage.set(response.error.info || 'Wikipedia error');
          return;
        }

        const searchResults = response.query.search;
        const totalHits = response.query.searchinfo.totalhits;

        const results: WikiSearchResult[] = searchResults.map(item => ({
          pageid: item.pageid,
          title: item.title,
          snippet: this.stripHtml(item.snippet),
          wordcount: item.wordcount,
        }));

        this.results.set(results);
        this.totalHits.set(totalHits);

        this.searchService.saveToHistory(term, totalHits).subscribe({
          error: (err) => console.error('Failed to save history:', err),
        });

        this.loadHistory();
      },
      error: (err) => {
        this.isSearching.set(false);

        if (err.status === 429) {
          const retryAfter = parseInt(err.headers.get('Retry-After') || '5', 10);
          this.errorMessage.set('Wikipedia rate limit reached. Please wait.');
          this.startCountdown(retryAfter);
        } else {
          const message = err?.error?.error?.info || err.message || 'Search failed';
          this.errorMessage.set(message);
        }

        console.error('Search error:', err);
      },
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.isSearching()) {
      this.onSearch();
    }
  }

  deleteHistoryItem(id: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    this.searchService.deleteHistoryItem(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.history.update(items => items.filter(item => item.id !== id));
        }
      },
      error: (err) => console.error('Failed to delete history item:', err),
    });
  }

  searchFromHistory(term: string): void {
    this.searchTerm.set(term);
    this.onSearch();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.results.set([]);
    this.totalHits.set(0);
    this.currentPage.set(1);
    this.errorMessage.set(null);
    this.rateLimitCountdown.set(0);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private startCountdown(seconds: number): void {
    this.rateLimitCountdown.set(seconds);

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      const current = this.rateLimitCountdown();
      if (current <= 1) {
        this.rateLimitCountdown.set(0);
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
      } else {
        this.rateLimitCountdown.set(current - 1);
      }
    }, 1000);
  }
}
