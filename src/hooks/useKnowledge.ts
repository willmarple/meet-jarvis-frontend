import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchKnowledge,
  getKnowledgeStatus,
  runKnowledgeHealthCheck,
  testOpenAIIntegration,
} from '../api/knowledge'

// Query Keys
export const knowledgeKeys = {
  all: ['knowledge'] as const,
  status: () => [...knowledgeKeys.all, 'status'] as const,
  health: (meetingId: string) => [...knowledgeKeys.all, 'health', meetingId] as const,
  search: (query: string, meetingId: string) => [...knowledgeKeys.all, 'search', query, meetingId] as const,
  openai: () => [...knowledgeKeys.all, 'openai'] as const,
}

/**
 * Hook for searching knowledge base
 */
export const useSearchKnowledge = () => {
  return useMutation({
    mutationFn: ({ query, meetingId }: { query: string; meetingId?: string }) =>
      searchKnowledge(query, meetingId),
  })
}

/**
 * Hook for getting knowledge base status
 */
export const useKnowledgeStatus = () => {
  return useQuery({
    queryKey: knowledgeKeys.status(),
    queryFn: getKnowledgeStatus,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for comprehensive knowledge health check
 */
export const useKnowledgeHealthCheck = (meetingId: string = 'TASKFLOW-DEMO') => {
  return useQuery({
    queryKey: knowledgeKeys.health(meetingId),
    queryFn: () => runKnowledgeHealthCheck(meetingId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook for manually triggering knowledge health check
 */
export const useRunKnowledgeHealthCheck = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (meetingId?: string) => runKnowledgeHealthCheck(meetingId),
    onSuccess: (data, meetingId) => {
      // Update the query cache with fresh data
      queryClient.setQueryData(
        knowledgeKeys.health(meetingId || 'TASKFLOW-DEMO'),
        data
      )
    },
  })
}

/**
 * Hook for testing OpenAI integration
 */
export const useOpenAIIntegrationTest = () => {
  return useQuery({
    queryKey: knowledgeKeys.openai(),
    queryFn: testOpenAIIntegration,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook for manually triggering OpenAI test
 */
export const useTestOpenAIIntegration = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: testOpenAIIntegration,
    onSuccess: (data) => {
      // Update the query cache with fresh data
      queryClient.setQueryData(knowledgeKeys.openai(), data)
    },
  })
}