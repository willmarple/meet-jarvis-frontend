import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  executeAITool,
  searchMeetingKnowledge,
  recallDecisions,
  summarizeTopic,
  testElevenLabsIntegration,
} from '../api/aiTools'
import type {
  SearchParams,
  RecallDecisionsParams,
  SummarizeTopicParams,
} from '../types/types'

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
      getToken,
    }: {
      toolName: string
      parameters: Record<string, unknown>
      meetingId?: string
      getToken?: () => Promise<string | null>
    }) => executeAITool(toolName, parameters, meetingId, getToken),
  })
}

/**
 * Hook for searching meeting knowledge
 */
export const useSearchMeetingKnowledge = () => {
  return useMutation({
    mutationFn: ({ params, meetingId, getToken }: { params: SearchParams; meetingId?: string; getToken?: () => Promise<string | null> }) =>
      searchMeetingKnowledge(params, meetingId, getToken),
  })
}

/**
 * Hook for recalling decisions
 */
export const useRecallDecisions = () => {
  return useMutation({
    mutationFn: ({ params, meetingId, getToken }: { params: RecallDecisionsParams; meetingId?: string; getToken?: () => Promise<string | null> }) =>
      recallDecisions(params, meetingId, getToken),
  })
}


/**
 * Hook for summarizing topics
 */
export const useSummarizeTopic = () => {
  return useMutation({
    mutationFn: ({ params, meetingId, getToken }: { params: SummarizeTopicParams; meetingId?: string; getToken?: () => Promise<string | null> }) =>
      summarizeTopic(params, meetingId, getToken),
  })
}


/**
 * Hook for testing ElevenLabs integration
 * This is a query (not mutation) because it's safe to run multiple times
 */
export const useElevenLabsIntegrationTest = (meetingId: string) => {
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
      if (meetingId) {
        queryClient.setQueryData(
          aiToolsKeys.elevenLabsTest(meetingId),
          data
        )
      }
    },
  })
}