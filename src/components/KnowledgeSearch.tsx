import React, { useState, useCallback } from 'react';
import { Search, Filter, Loader2, Brain, Sparkles } from 'lucide-react';
import { type SearchResult } from '../types/types';
import { type MeetingKnowledge } from '../lib/supabase';

interface KnowledgeSearchProps {
  onSearch: (query: string, filters: SearchFilters) => Promise<SearchResult[]>;
  isLoading: boolean;
  results: SearchResult[];
  error: string | null;
}

export interface SearchFilters {
  contentType?: MeetingKnowledge['content_type'];
  source?: MeetingKnowledge['source'];
  threshold?: number;
  meetingScope?: 'current' | 'all';
}

export const KnowledgeSearch: React.FC<KnowledgeSearchProps> = ({
  onSearch,
  isLoading,
  results,
  error
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    threshold: 0.7,
    meetingScope: 'current'
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim()) {
      await onSearch(searchQuery.trim(), filters);
    }
  }, [onSearch, filters]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Debounced search
    const timeoutId = setTimeout(() => {
      if (newQuery.trim()) {
        handleSearch(newQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [handleSearch]);

  const handleFilterChange = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    if (query.trim()) {
      handleSearch(query);
    }
  }, [filters, query, handleSearch]);

  const getTypeIcon = (type: MeetingKnowledge['content_type']) => {
    switch (type) {
      case 'fact': return '📋';
      case 'context': return '🔍';
      case 'summary': return '📝';
      case 'question': return '❓';
      case 'answer': return '💡';
      default: return '📄';
    }
  };

  const getTypeColor = (type: MeetingKnowledge['content_type']) => {
    switch (type) {
      case 'fact': return 'bg-blue-500/20 text-blue-400';
      case 'context': return 'bg-green-500/20 text-green-400';
      case 'summary': return 'bg-purple-500/20 text-purple-400';
      case 'question': return 'bg-orange-500/20 text-orange-400';
      case 'answer': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatSimilarity = (similarity?: number) => {
    if (!similarity) return null;
    return `${Math.round(similarity * 100)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search meeting knowledge..."
          className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {isLoading && (
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin mr-3" />
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`mr-3 p-1 rounded ${showFilters ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Content Type
              </label>
              <select
                value={filters.contentType || ''}
                onChange={(e) => handleFilterChange({ 
                  contentType: e.target.value as MeetingKnowledge['content_type'] || undefined 
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="">All Types</option>
                <option value="fact">Facts</option>
                <option value="context">Context</option>
                <option value="summary">Summaries</option>
                <option value="question">Questions</option>
                <option value="answer">Answers</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Source
              </label>
              <select
                value={filters.source || ''}
                onChange={(e) => handleFilterChange({ 
                  source: e.target.value as MeetingKnowledge['source'] || undefined 
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="">All Sources</option>
                <option value="user">User</option>
                <option value="ai">AI</option>
                <option value="document">Document</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Similarity Threshold: {Math.round((filters.threshold || 0.7) * 100)}%
              </label>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={filters.threshold || 0.7}
                onChange={(e) => handleFilterChange({ threshold: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Search Scope
              </label>
              <select
                value={filters.meetingScope || 'current'}
                onChange={(e) => handleFilterChange({ 
                  meetingScope: e.target.value as 'current' | 'all' 
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="current">Current Meeting</option>
                <option value="all">All Meetings</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {results.length === 0 && query && !isLoading && (
          <div className="text-center py-8 text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No results found for "{query}"</p>
            <p className="text-sm">Try adjusting your search terms or filters</p>
          </div>
        )}

        {results.map((result) => (
          <div
            key={result.id}
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getTypeIcon(result.content_type)}</div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(result.content_type)}`}>
                    {result.content_type}
                  </span>
                  
                  <span className="text-xs text-gray-400">
                    {result.source === 'ai' ? '🤖 AI' : '👤 User'}
                  </span>
                  
                  {result.similarity && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                      {formatSimilarity(result.similarity)} match
                    </span>
                  )}
                  
                  {result.keyword_match && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                      keyword match
                    </span>
                  )}
                </div>
                
                <p className="text-white text-sm leading-relaxed mb-2">
                  {result.content}
                </p>
                
                {result.summary && result.summary !== result.content && (
                  <p className="text-gray-400 text-xs italic mb-2">
                    Summary: {result.summary}
                  </p>
                )}
                
                {result.keywords && result.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {result.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(result.created_at).toLocaleString()}</span>
                  {result.embedding && (
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Enhanced
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};