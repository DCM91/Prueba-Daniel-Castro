export interface WikiSearchResult {
  pageid: number;
  title: string;
  snippet: string;
  wordcount: number;
}

export interface WikipediaRawResult {
  pageid: number;
  title: string;
  snippet: string;
  wordcount: number;
  timestamp: string;
}

export interface WikipediaApiResponse {
  query: {
    searchinfo: { totalhits: number };
    search: WikipediaRawResult[];
  };
  error?: {
    code: string;
    info: string;
  };
}

export interface SaveHistoryResponse {
  success: boolean;
  error?: string;
}

export interface HistoryItem {
  id: string;
  term: string;
  results_count: number;
  created_at: string;
}

export interface HistoryResponse {
  success: boolean;
  data?: HistoryItem[];
  error?: string;
}

export interface DeleteHistoryResponse {
  success: boolean;
  message?: string;
  error?: string;
}
