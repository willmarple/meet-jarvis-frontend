import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  executeAITool,
  searchMeetingKnowledge,
  recallDecisions,
  getActionItems,
  summarizeTopic,
  findSimilarDiscussions,
  testElevenLabsIntegration,
} from '../api/aiTools'
import type {
  SearchParams,
  RecallDecisionsParams,
  GetActionItemsParams,
  SummarizeTopicParams,
  FindSimilarDiscussionsParams,
} from '../../shared/types'

// Query Keys
export const aiToolsKeys = {
  all: ['aiTools'] as const,
  elevenlabs: () => [...aiToolsKeys.all, 'elevenlabs'] as const,
  elevenLabsTest: (meetingId: string) => [...aiToolsKeys.elevenlabs(), 'test', meetingId] as const,
}

/**
 * Hook for executing any AI tool
 */
export const useExecuteAITool = () => {
  return useMutation({
    mutationFn: ({
      toolName,
      parameters,
      meetingId,
    }: {
      toolName: string
      parameters: Record<string, unknown>
      meetingId?: string
    }) => executeAITool(toolName, parameters, meetingId),
  })
}

/**
 * Hook for searching meeting knowledge
 */
export const useSearchMeetingKnowledge = () => {
  return useMutation({
    mutationFn: ({ params, meetingId }: { params: SearchParams; meetingId?: string }) =>
      searchMeetingKnowledge(params, meetingId),
  })
}

/**
 * Hook for recalling decisions
 */
export const useRecallDecisions = () => {
  return useMutation({
    mutationFn: ({ params, meetingId }: { params: RecallDecisionsParams; meetingId?: string }) =>
      recallDecisions(params, meetingId),
  })
}

/**
 * Hook for getting action items
 */
export const useGetActionItems = () => {
  return useMutation({
    mutationFn: ({ params, meetingId }: { params: GetActionItemsParams; meetingId?: string }) =>
      getActionItems(params, meetingId),
  })
}

/**
 * Hook for summarizing topics
 */
export const useSummarizeTopic = () => {
  return useMutation({
    mutationFn: ({ params, meetingId }: { params: SummarizeTopicParams; meetingId?: string }) =>
      summarizeTopic(params, meetingId),
  })
}

/**
 * Hook for finding similar discussions
 */
export const useFindSimilarDiscussions = () => {
  return useMutation({
    mutationFn: ({ params, meetingId }: { params: FindSimilarDiscussionsParams; meetingId?: string }) =>
      findSimilarDiscussions(params, meetingId),
  })
}

/**
 * Hook for testing ElevenLabs integration
 * This is a query (not mutation) because it's safe to run multiple times
 */
export const useElevenLabsIntegrationTest = (meetingId: string = 'TASKFLOW-DEMO') => {
  return useQuery({
    queryKey: aiToolsKeys.elevenLabsTest(meetingId),
    queryFn: () => testElevenLabsIntegration(meetingId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook for manually triggering ElevenLabs test
 */
export const useTestElevenLabsIntegration = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (meetingId?: string) => testElevenLabsIntegration(meetingId),
    onSuccess: (data, meetingId) => {
      // Update the query cache with fresh data
      queryClient.setQueryData(
        aiToolsKeys.elevenLabsTest(meetingId || 'TASKFLOW-DEMO'),
        data
      )
    },
  })
}