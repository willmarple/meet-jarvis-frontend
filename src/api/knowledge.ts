import { apiClient } from './client'
import type {
  ApiResponse,
  SearchResult,
  KnowledgeHealthResult,
} from '../types/types'

/**
 * Perform RAG search on knowledge base
 */
export const searchKnowledge = async (
  query: string,
  meetingId?: string
): Promise<SearchResult[]> => {
  const { data } = await apiClient.post<ApiResponse<{ results: SearchResult[] }>>('/test/rag-search', {
    query,
    meetingId: meetingId || 'TASKFLOW-DEMO',
  })
  
  if (!data.success) {
    throw new Error(data.error || 'Knowledge search failed')
  }
  
  return data.data?.results || []
}

/**
 * Get knowledge base status and statistics
 */
export const getKnowledgeStatus = async (): Promise<{
  totalItems: number
  withEmbeddings: number
  byType: Record<string, number>
  bySource: Record<string, number>
}> => {
  const { data } = await apiClient.get<ApiResponse<{
    stats: {
      totalItems: number
      withEmbeddings: number
      byType: Record<string, number>
      bySource: Record<string, number>
    }
  }>>('/test/knowledge-status')
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to get knowledge status')
  }
  
  return data.data?.stats || { totalItems: 0, withEmbeddings: 0, byType: {}, bySource: {} }
}

/**
 * Run comprehensive knowledge base health check
 */
export const runKnowledgeHealthCheck = async (
  meetingId?: string
): Promise<KnowledgeHealthResult> => {
  const { data } = await apiClient.get<ApiResponse<KnowledgeHealthResult>>('/test/knowledge-comprehensive', {
    params: {
      meetingId: meetingId || 'TASKFLOW-DEMO',
    },
  })
  
  if (!data.success) {
    throw new Error(data.error || 'Knowledge health check failed')
  }
  
  return data.data!
}

/**
 * Test OpenAI integration
 */
export const testOpenAIIntegration = async (): Promise<{
  embedding_test: { success: boolean; dimensions?: number; error?: string }
  api_connectivity: { success: boolean; error?: string }
}> => {
  const { data } = await apiClient.get<ApiResponse<{
    results: {
      embedding_test: { success: boolean; dimensions?: number; error?: string }
      api_connectivity: { success: boolean; error?: string }
    }
  }>>('/test/openai')
  
  if (!data.success) {
    throw new Error(data.error || 'OpenAI integration test failed')
  }
  
  return data.data?.results || { embedding_test: { success: false }, api_connectivity: { success: false } }
}