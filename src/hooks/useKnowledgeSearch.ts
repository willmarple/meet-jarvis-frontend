import { useState, useCallback, useRef } from 'react';
import { useSearchKnowledge } from './useKnowledge';
import { type SearchResult } from '../types/types';
import { type SearchFilters } from '../components/KnowledgeSearch';

interface UseKnowledgeSearchProps {
  meetingId: string;
}

export const useKnowledgeSearch = ({ meetingId }: UseKnowledgeSearchProps) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [lastQuery, setLastQuery] = useState('');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchMutation = useSearchKnowledge();

  const search = useCallback(async (query: string, filters: SearchFilters = {}) => {
    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLastQuery(query);

    try {
      const searchMeetingId = filters.meetingScope === 'all' ? undefined : meetingId;
      
      const searchResults = await searchMutation.mutateAsync({
        query,
        meetingId: searchMeetingId
      });

      // Filter results based on additional filters
      let filteredResults = searchResults;
      
      if (filters.contentType) {
        filteredResults = filteredResults.filter(r => r.content_type === filters.contentType);
      }
      
      if (filters.source) {
        filteredResults = filteredResults.filter(r => r.source === filters.source);
      }

      setResults(filteredResults);
    } catch (error: unknown) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setResults([]);
      }
    }
  }, [meetingId, searchMutation]);

  const clearResults = useCallback(() => {
    setResults([]);
    setLastQuery('');
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Note: AI context building now happens through the ElevenLabs clientTools system
  const buildAIContext = useCallback(async (query: string): Promise<string> => {
    console.log('AI context building now handled by ElevenLabs clientTools for query:', query);
    return `Context for: ${query}`;
  }, []);

  return {
    results,
    isLoading: searchMutation.isPending,
    error: searchMutation.error?.message || null,
    lastQuery,
    search,
    clearResults,
    buildAIContext
  };
};