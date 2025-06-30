import { apiClient, createAuthenticatedApiClient } from './client'
import type {
  ApiResponse,
  ToolResult,
  SearchParams,
  RecallDecisionsParams,
  SummarizeTopicParams,
  SearchKnowledgeResult,
  RecallDecisionsResult,
  TopicSummaryResult,
  ElevenLabsTestResult,
} from '../types/types'

/**
 * Execute a specific AI tool using secure authentication
 */
export const executeAITool = async (
  toolName: string,
  parameters: Record<string, unknown>,
  meetingId?: string,
  getToken?: () => Promise<string | null>
): Promise<ToolResult> => {
  if (!meetingId) {
    throw new Error('meetingId is required for AI tool execution')
  }
  
  try {
    // Try secure endpoint first (requires authentication)
    const authClient = await createAuthenticatedApiClient(getToken)
    const { data } = await authClient.post<ApiResponse<ToolResult> & { result: ToolResult }>(`/secure/meetings/${meetingId}/ai-tools`, {
      toolName,
      parameters,
    })
    
    // The backend returns { success: true, message: "...", result: { success: true, data: {...} } }
    if (!data.success) {
      throw new Error(data.error || 'API request failed')
    }
    
    return data.result || { success: false, error: 'No result returned from backend' }
  } catch (secureError) {
    console.warn('Secure AI tools endpoint failed, falling back to test endpoint:', secureError);
    
    // Fallback to test endpoint (for development/testing)
    const { data } = await apiClient.post<ApiResponse<ToolResult> & { result: ToolResult }>('/test/ai-tools', {
      toolName,
      parameters,
      meetingId,
    })
    
    if (!data.success) {
      throw new Error(data.error || 'API request failed')
    }
    
    return data.result || { success: false, error: 'No result returned from backend' }
  }
}

/**
 * Search meeting knowledge using semantic search
 */
export const searchMeetingKnowledge = async (
  params: SearchParams,
  meetingId?: string,
  getToken?: () => Promise<string | null>
): Promise<SearchKnowledgeResult> => {
  const result = await executeAITool('search_meeting_knowledge', params as unknown as Record<string, unknown>, meetingId, getToken)
  
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
  meetingId?: string,
  getToken?: () => Promise<string | null>
): Promise<RecallDecisionsResult> => {
  const result = await executeAITool('recall_decisions', params as unknown as Record<string, unknown>, meetingId, getToken)
  
  if (!result.success) {
    throw new Error(result.error || 'Recall decisions failed')
  }
  
  return result.data as unknown as RecallDecisionsResult
}


/**
 * Generate a summary of discussions on a specific topic
 */
export const summarizeTopic = async (
  params: SummarizeTopicParams,
  meetingId?: string,
  getToken?: () => Promise<string | null>
): Promise<TopicSummaryResult> => {
  const result = await executeAITool('summarize_topic', params as unknown as Record<string, unknown>, meetingId, getToken)
  
  if (!result.success) {
    throw new Error(result.error || 'Summarize topic failed')
  }
  
  return result.data as unknown as TopicSummaryResult
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