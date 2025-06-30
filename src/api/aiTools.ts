import { apiClient } from './client'
import type {
  ApiResponse,
  ToolResult,
  SearchParams,
  RecallDecisionsParams,
  GetActionItemsParams,
  SummarizeTopicParams,
  FindSimilarDiscussionsParams,
  SearchKnowledgeResult,
  RecallDecisionsResult,
  ActionItemsResult,
  TopicSummaryResult,
  SimilarDiscussionsResult,
  ElevenLabsTestResult,
} from '../types/types'

/**
 * Execute a specific AI tool
 */
export const executeAITool = async (
  toolName: string,
  parameters: Record<string, unknown>,
  meetingId?: string
): Promise<ToolResult> => {
  if (!meetingId) {
    throw new Error('meetingId is required for AI tool execution')
  }
  
  const { data } = await apiClient.post<ApiResponse<ToolResult> & { result: ToolResult }>('/test/ai-tools', {
    toolName,
    parameters,
    meetingId,
  })
  
  // The backend returns { success: true, message: "...", result: { success: true, data: {...} } }
  if (!data.success) {
    throw new Error(data.error || 'API request failed')
  }
  
  return data.result || { success: false, error: 'No result returned from backend' }
}

/**
 * Search meeting knowledge using semantic search
 */
export const searchMeetingKnowledge = async (
  params: SearchParams,
  meetingId?: string
): Promise<SearchKnowledgeResult> => {
  const result = await executeAITool('search_meeting_knowledge', params as unknown as Record<string, unknown>, meetingId)
  
  if (!result.success) {
    throw new Error(result.error || 'Search failed')
  }
  
  return result.data as unknown as SearchKnowledgeResult
}

/**
 * Recall specific decisions made in meetings
 */
export const recallDecisions = async (
  params: RecallDecisionsParams,
  meetingId?: string
): Promise<RecallDecisionsResult> => {
  const result = await executeAITool('recall_decisions', params as unknown as Record<string, unknown>, meetingId)
  
  if (!result.success) {
    throw new Error(result.error || 'Recall decisions failed')
  }
  
  return result.data as unknown as RecallDecisionsResult
}

/**
 * Get action items from meeting discussions
 */
export const getActionItems = async (
  params: GetActionItemsParams,
  meetingId?: string
): Promise<ActionItemsResult> => {
  const result = await executeAITool('get_action_items', params as unknown as Record<string, unknown>, meetingId)
  
  if (!result.success) {
    throw new Error(result.error || 'Get action items failed')
  }
  
  return result.data as unknown as ActionItemsResult
}

/**
 * Generate a summary of discussions on a specific topic
 */
export const summarizeTopic = async (
  params: SummarizeTopicParams,
  meetingId?: string
): Promise<TopicSummaryResult> => {
  const result = await executeAITool('summarize_topic', params as unknown as Record<string, unknown>, meetingId)
  
  if (!result.success) {
    throw new Error(result.error || 'Summarize topic failed')
  }
  
  return result.data as unknown as TopicSummaryResult
}

/**
 * Find similar discussions from meeting history
 */
export const findSimilarDiscussions = async (
  params: FindSimilarDiscussionsParams,
  meetingId?: string
): Promise<SimilarDiscussionsResult> => {
  const result = await executeAITool('find_similar_discussions', params as unknown as Record<string, unknown>, meetingId)
  
  if (!result.success) {
    throw new Error(result.error || 'Find similar discussions failed')
  }
  
  return result.data as unknown as SimilarDiscussionsResult
}

/**
 * Test all ElevenLabs tools integration
 */
export const testElevenLabsIntegration = async (
  meetingId?: string
): Promise<ElevenLabsTestResult> => {
  if (!meetingId) {
    throw new Error('meetingId is required for ElevenLabs integration test')
  }
  
  const { data } = await apiClient.post<ApiResponse<ElevenLabsTestResult>>('/test/elevenlabs-tools', {
    meetingId,
  })
  
  if (!data.success) {
    throw new Error(data.error || 'ElevenLabs integration test failed')
  }
  
  return data.data!
}