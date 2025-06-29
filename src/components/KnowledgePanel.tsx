import React, { useState, useEffect } from 'react';
import { Brain, Plus, MessageSquare, FileText, Lightbulb, X, Search, List, Sparkles, Loader2 } from 'lucide-react';
import { type MeetingKnowledge } from '../lib/supabase';
import { KnowledgeSearch } from './KnowledgeSearch';
import { useKnowledgeSearch } from '../hooks/useKnowledgeSearch';

interface KnowledgePanelProps {
  knowledge: MeetingKnowledge[];
  onAddKnowledge: (content: string, type: MeetingKnowledge['content_type']) => void;
  isVisible: boolean;
  onClose: () => void;
  meetingId: string;
}

export const KnowledgePanel: React.FC<KnowledgePanelProps> = ({
  knowledge,
  onAddKnowledge,
  isVisible,
  onClose,
  meetingId
}) => {
  const [newKnowledge, setNewKnowledge] = useState('');
  const [selectedType, setSelectedType] = useState<MeetingKnowledge['content_type']>('fact');
  const [activeTab, setActiveTab] = useState<'browse' | 'search'>('browse');
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

  const {
    results: searchResults,
    isLoading: isSearching,
    error: searchError,
    search,
    clearResults
  } = useKnowledgeSearch({ meetingId });

  // Note: Background knowledge processing now happens on the backend

  // Track items being processed
  useEffect(() => {
    const itemsNeedingProcessing = knowledge
      .filter(item => !item.embedding || !item.keywords || !item.summary)
      .map(item => item.id);
    
    setProcessingItems(new Set(itemsNeedingProcessing));
  }, [knowledge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newKnowledge.trim()) {
      onAddKnowledge(newKnowledge.trim(), selectedType);
      setNewKnowledge('');
    }
  };

  const handleTabChange = (tab: 'browse' | 'search') => {
    setActiveTab(tab);
    if (tab === 'browse') {
      clearResults();
    }
  };

  const getTypeIcon = (type: MeetingKnowledge['content_type']) => {
    switch (type) {
      case 'fact': return <FileText className="w-4 h-4" />;
      case 'context': return <MessageSquare className="w-4 h-4" />;
      case 'summary': return <Lightbulb className="w-4 h-4" />;
      case 'question': return <MessageSquare className="w-4 h-4" />;
      case 'answer': return <Lightbulb className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
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

  const isItemProcessing = (item: MeetingKnowledge) => {
    return processingItems.has(item.id);
  };

  const isItemAIEnhanced = (item: MeetingKnowledge) => {
    return !!(item.embedding && item.keywords && item.summary);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-900/95 backdrop-blur-sm border-l border-gray-700/50 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-400" />
          <h2 className="text-white font-semibold">Meeting Knowledge</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700/50">
        <button
          onClick={() => handleTabChange('browse')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'browse'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <List className="w-4 h-4" />
          Browse ({knowledge.length})
        </button>
        <button
          onClick={() => handleTabChange('search')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'search'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* Add Knowledge Form */}
      <div className="p-4 border-b border-gray-700/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as MeetingKnowledge['content_type'])}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="fact">Fact</option>
              <option value="context">Context</option>
              <option value="summary">Summary</option>
              <option value="question">Question</option>
              <option value="answer">Answer</option>
            </select>
          </div>
          
          <div>
            <textarea
              value={newKnowledge}
              onChange={(e) => setNewKnowledge(e.target.value)}
              placeholder="Add knowledge to this meeting..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
          
          <button
            type="submit"
            disabled={!newKnowledge.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Knowledge
          </button>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'browse' ? (
          <div className="p-4 space-y-3">
            {knowledge.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No knowledge added yet</p>
                <p className="text-sm">Start adding facts, context, or summaries</p>
              </div>
            ) : (
              knowledge.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`p-1 rounded ${getTypeColor(item.content_type)}`}>
                      {getTypeIcon(item.content_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(item.content_type)}`}>
                          {item.content_type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.source === 'ai' ? '🤖 AI' : '👤 User'}
                        </span>
                        {isItemProcessing(item) && (
                          <span className="flex items-center gap-1 text-xs text-yellow-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing...
                          </span>
                        )}
                        {isItemAIEnhanced(item) && !isItemProcessing(item) && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <Sparkles className="w-3 h-3" />
                            AI Enhanced
                          </span>
                        )}
                      </div>
                      <p className="text-white text-sm leading-relaxed">{item.content}</p>
                      
                      {item.summary && item.summary !== item.content && (
                        <p className="text-gray-400 text-xs italic mt-1">
                          Summary: {item.summary}
                        </p>
                      )}
                      
                      {item.keywords && item.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4">
            <KnowledgeSearch
              onSearch={search}
              isLoading={isSearching}
              results={searchResults}
              error={searchError}
            />
          </div>
        )}
      </div>
    </div>
  );
};