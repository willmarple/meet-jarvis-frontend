import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useConversation } from '@elevenlabs/react';
import { 
  useSearchMeetingKnowledge, 
  useRecallDecisions, 
  useGetActionItems, 
  useSummarizeTopic, 
  useFindSimilarDiscussions 
} from './useAITools';
import type { GetActionItemsParams, FindSimilarDiscussionsParams, ToolCall as ImportedToolCall, ToolResult, JsonValue } from '../types/types';

interface KnowledgeItem {
  id: string;
  content: string;
  [key: string]: unknown;
}

// Use the imported ToolCall type for consistency
type ToolCall = ImportedToolCall;

interface ElevenLabsMessage {
  type?: string;
  source?: string;
  message?: string;
  tool_name?: string;
  parameters?: Record<string, JsonValue>;
}

interface UseElevenLabsVoiceRAGProps {
  onResponse?: (response: string) => void;
  onTranscription?: (text: string) => void;
  onToolCall?: (toolCall: ToolCall, result: ToolResult) => void;
  meetingContext?: {
    meetingId: string;
    participants: string[];
    existingKnowledge: KnowledgeItem[];
  };
}

export const useElevenLabsVoiceRAG = ({ 
  onResponse, 
  onTranscription,
  onToolCall,
  meetingContext 
}: UseElevenLabsVoiceRAGProps = {}) => {
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastToolCall, setLastToolCall] = useState<ToolCall | null>(null);
  const initializationRef = useRef(false);
  const connectionAttemptRef = useRef(false);

  // Get agent ID from environment
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;

  // Get React Query mutations for AI tools
  const searchKnowledgeMutation = useSearchMeetingKnowledge();
  const recallDecisionsMutation = useRecallDecisions();
  const getActionItemsMutation = useGetActionItems();
  const summarizeTopicMutation = useSummarizeTopic();
  const findSimilarDiscussionsMutation = useFindSimilarDiscussions();

  // Memoize the meeting context to prevent unnecessary re-renders
  const stableMeetingContext = useMemo(() => {
    if (!meetingContext) return null;
    return {
      meetingId: meetingContext.meetingId,
      participantCount: meetingContext.participants.length,
      knowledgeCount: meetingContext.existingKnowledge.length
    };
  }, [meetingContext?.meetingId, meetingContext?.participants.length, meetingContext?.existingKnowledge.length]); // eslint-disable-line react-hooks/exhaustive-deps

  console.log('🎤 ElevenLabs RAG Hook - Initializing with:', {
    agentId: agentId ? `${agentId.substring(0, 8)}...` : 'NOT SET',
    fullAgentId: agentId, // Show full agent ID for debugging
    hasOnResponse: !!onResponse,
    hasOnTranscription: !!onTranscription,
    hasClientTools: !!meetingContext,
    meetingContext: stableMeetingContext
  });

  // Validate agent ID
  useEffect(() => {
    if (!agentId) {
      const errorMsg = 'VITE_ELEVENLABS_AGENT_ID not found in environment variables';
      console.error('🎤 ElevenLabs RAG Hook - Configuration Error:', errorMsg);
      setError(errorMsg);
      return;
    }

    console.log('🎤 ElevenLabs RAG Hook - Agent ID configured successfully');
    setIsSDKReady(true);
    setError(null);
  }, [agentId]);

  // Enhanced message callback with RAG context and tool handling
  const onMessageCallback = useCallback(async (message: unknown) => {
    const msg = message as ElevenLabsMessage;
    console.log('🎤 ElevenLabs RAG - Message received:', {
      type: msg.type,
      source: msg.source,
      message: msg.message?.substring(0, 100) + ((msg.message?.length ?? 0) > 100 ? '...' : ''),
      timestamp: new Date().toISOString()
    });

    // Handle user transcriptions
    if (msg.source === 'user' && msg.message && onTranscription) {
      console.log('🎤 ElevenLabs RAG - Processing user transcription');
      onTranscription(msg.message);

      // Note: Context building now happens through the clientTools system
      // when the ElevenLabs AI agent calls our knowledge search tools
      console.log('🎤 ElevenLabs RAG - User input logged, tools available for AI agent');
    } 
    // Handle AI responses
    else if (msg.source === 'ai' && msg.message && onResponse) {
      console.log('🎤 ElevenLabs RAG - Processing AI response');
      onResponse(msg.message);
    }
    // Handle tool calls (now handled automatically by clientTools configuration)
    else if (msg.type === 'tool_call') {
      console.log('🎤 ElevenLabs RAG - Tool call detected (handled by clientTools):', {
        toolName: msg.tool_name,
        parameters: msg.parameters
      });
      
      const toolCall: ToolCall = {
        name: msg.tool_name || 'unknown',
        parameters: msg.parameters || {}
      };
      setLastToolCall(toolCall);
      
      if (onToolCall) {
        onToolCall(toolCall, { success: true, data: 'Handled by clientTools' });
      }
    }
  }, [onTranscription, onResponse, onToolCall]);

  // Stable callback refs to prevent re-renders
  const onConnectCallback = useCallback(() => {
    console.log('🎤 ElevenLabs RAG - Connected successfully');
    connectionAttemptRef.current = false;
  }, []);

  const onDisconnectCallback = useCallback(() => {
    console.log('🎤 ElevenLabs RAG - Disconnected');
    connectionAttemptRef.current = false;
    initializationRef.current = false;
  }, []);

  const onErrorCallback = useCallback((error: unknown) => {
    console.error('🎤 ElevenLabs RAG - Error occurred:', error);
    const errorMessage = error instanceof Error ? error.message : 'ElevenLabs conversation error';
    setError(errorMessage);
    connectionAttemptRef.current = false;
    initializationRef.current = false;
  }, []);

  const onStatusChangeCallback = useCallback((status: unknown) => {
    console.log('🎤 ElevenLabs RAG - Status changed:', status);
  }, []);

  // Create client tools configuration for ElevenLabs
  const clientTools = useMemo(() => {
    console.log('🔧 clientTools useMemo - meetingContext:', meetingContext ? 'AVAILABLE' : 'NULL');
    
    if (!meetingContext) {
      console.log('🔧 No meeting context - returning undefined clientTools');
      return undefined;
    }
    
    const tools = {
      search_meeting_knowledge: async (parameters: { query: string; content_type?: string; limit?: number }) => {
        try {
          console.log('🔧 Executing search_meeting_knowledge:', parameters);
          const result = await searchKnowledgeMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          
          console.log('🔧 search_meeting_knowledge backend result:', result);
          
          // Return a simple string response that ElevenLabs can easily understand
          if (result.results && result.results.length > 0) {
            const topResults = result.results.slice(0, 3);
            const formattedResults = topResults.map((r, i) => 
              `${i + 1}. ${r.content} (${Math.round(r.similarity * 100)}% match)`
            ).join('\n');
            const response = `KNOWLEDGE FOUND: Found ${result.results.length} items about "${parameters.query}":\n${formattedResults}`;
            console.log('🔧 search_meeting_knowledge returning:', response);
            return response;
          } else {
            const response = `No knowledge items found matching "${parameters.query}" in the meeting.`;
            console.log('🔧 search_meeting_knowledge returning:', response);
            return response;
          }
        } catch (error) {
          console.error('🔧 Tool execution failed - search_meeting_knowledge:', error);
          const response = `Error searching for "${parameters.query}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.log('🔧 search_meeting_knowledge returning error:', response);
          return response;
        }
      },
      
      recall_decisions: async (parameters: { topic: string }) => {
        try {
          console.log('🔧 Executing recall_decisions:', parameters);
          const result = await recallDecisionsMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          
          console.log('🔧 recall_decisions backend result:', result);
          
          // Return a simple string response that ElevenLabs can easily understand
          if (result.decisions && result.decisions.length > 0) {
            const topDecision = result.decisions[0];
            const response = `DECISION FOUND: ${topDecision.content} (Confidence: ${Math.round(topDecision.similarity * 100)}%)`;
            console.log('🔧 recall_decisions returning:', response);
            return response;
          } else {
            const response = `No decisions found about ${parameters.topic} in the meeting knowledge base.`;
            console.log('🔧 recall_decisions returning:', response);
            return response;
          }
        } catch (error) {
          console.error('🔧 Tool execution failed - recall_decisions:', error);
          const response = `Error searching for decisions about ${parameters.topic}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.log('🔧 recall_decisions returning error:', response);
          return response;
        }
      },
      
      get_action_items: async (parameters: GetActionItemsParams) => {
        try {
          console.log('🔧 Executing get_action_items:', parameters);
          const result = await getActionItemsMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          
          console.log('🔧 get_action_items result:', result);
          
          // Return a simple string response that ElevenLabs can easily understand
          if (result.action_items && result.action_items.length > 0) {
            const itemsList = result.action_items.map((item: { content: string }) => item.content).join('; ');
            const response = `ACTION ITEMS (${parameters.status || 'all'}): ${itemsList}`;
            console.log('🔧 get_action_items returning:', response);
            return response;
          } else {
            const response = `No action items found for status: ${parameters.status || 'all'}`;
            console.log('🔧 get_action_items returning:', response);
            return response;
          }
        } catch (error) {
          console.error('🔧 Tool execution failed - get_action_items:', error);
          const response = `Error retrieving action items for status ${parameters.status || 'all'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.log('🔧 get_action_items returning error:', response);
          return response;
        }
      },
      
      summarize_topic: async (parameters: { topic: string }) => {
        try {
          console.log('🔧 Executing summarize_topic:', parameters);
          const result = await summarizeTopicMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          
          console.log('🔧 summarize_topic backend result:', result);
          
          // Return a simple string response that ElevenLabs can easily understand
          if (result.summary) {
            const response = `TOPIC SUMMARY: ${result.summary}`;
            console.log('🔧 summarize_topic returning:', response);
            return response;
          } else {
            const response = `No summary available for topic "${parameters.topic}".`;
            console.log('🔧 summarize_topic returning:', response);
            return response;
          }
        } catch (error) {
          console.error('🔧 Tool execution failed - summarize_topic:', error);
          const response = `Error summarizing topic "${parameters.topic}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.log('🔧 summarize_topic returning error:', response);
          return response;
        }
      },
      
      find_similar_discussions: async (parameters: FindSimilarDiscussionsParams) => {
        try {
          console.log('🔧 Executing find_similar_discussions:', parameters);
          const result = await findSimilarDiscussionsMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          
          console.log('🔧 find_similar_discussions result:', result);
          
          // Return a simple string response that ElevenLabs can easily understand
          if (result.similar_discussions && result.similar_discussions.length > 0) {
            const topDiscussion = result.similar_discussions[0];
            const response = `SIMILAR DISCUSSIONS: Found ${result.similar_discussions.length} discussions. Top match: ${topDiscussion.content} (${Math.round(topDiscussion.similarity * 100)}% match)`;
            console.log('🔧 find_similar_discussions returning:', response);
            return response;
          } else {
            const response = `No similar discussions found for: ${parameters.reference_text}`;
            console.log('🔧 find_similar_discussions returning:', response);
            return response;
          }
        } catch (error) {
          console.error('🔧 Tool execution failed - find_similar_discussions:', error);
          const response = `Error finding similar discussions for "${parameters.reference_text}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.log('🔧 find_similar_discussions returning error:', response);
          return response;
        }
      }
    };
    
    console.log('🔧 Client tools created successfully:', Object.keys(tools));
    console.log('🔧 Tools registered:', tools);
    return tools;
  }, [
    meetingContext,
    searchKnowledgeMutation,
    recallDecisionsMutation,
    getActionItemsMutation,
    summarizeTopicMutation,
    findSimilarDiscussionsMutation
  ]);

  // Use the ElevenLabs conversation hook with client tools and stable callbacks
  console.log('🔧 Passing clientTools to useConversation:', clientTools ? Object.keys(clientTools) : 'undefined');
  
  const conversation = useConversation({
    clientTools,
    onConnect: onConnectCallback,
    onDisconnect: onDisconnectCallback,
    onMessage: onMessageCallback,
    onError: onErrorCallback,
    onStatusChange: onStatusChangeCallback
  });

  const connect = useCallback(async () => {
    if (!isSDKReady) {
      const errorMsg = 'SDK not ready - check agent ID configuration';
      console.error('🎤 ElevenLabs RAG - Connect failed:', errorMsg);
      setError(errorMsg);
      return;
    }

    if (conversation.status === 'connected') {
      console.log('🎤 ElevenLabs RAG - Already connected, skipping');
      return;
    }

    if (connectionAttemptRef.current) {
      console.log('🎤 ElevenLabs RAG - Connection already in progress');
      return;
    }

    try {
      console.log('🎤 ElevenLabs RAG - Starting connection process...');
      connectionAttemptRef.current = true;
      initializationRef.current = true;
      setError(null);

      // Prepare initial context for the AI agent
      if (meetingContext) {
        const availableTools = clientTools ? Object.keys(clientTools) : [];
        console.log(`Meeting Context: ${meetingContext.meetingId} with ${meetingContext.participants.length} participants. ${meetingContext.existingKnowledge.length} knowledge items available. Available tools: ${availableTools.join(', ')}.`);
      }

      // Start the conversation - tools are now configured via clientTools
      console.log('🔧 Starting session with agent ID:', agentId);
      console.log('🔧 Client tools available for session:', clientTools ? Object.keys(clientTools) : 'none');
      
      await conversation.startSession({
        agentId: agentId!
      });

      console.log('🎤 ElevenLabs RAG - Connection initiated successfully');
    } catch (error: unknown) {
      console.error('🎤 ElevenLabs RAG - Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to ElevenLabs';
      setError(errorMessage);
      connectionAttemptRef.current = false;
      initializationRef.current = false;
    }
  }, [isSDKReady, agentId, conversation, meetingContext, clientTools]);

  const disconnect = useCallback(async () => {
    if (conversation.status === 'disconnected') {
      console.log('🎤 ElevenLabs RAG - Already disconnected, skipping');
      return;
    }

    try {
      console.log('🎤 ElevenLabs RAG - Disconnecting...');
      await conversation.endSession();
      console.log('🎤 ElevenLabs RAG - Disconnected successfully');
      setError(null);
    } catch (error: unknown) {
      console.error('🎤 ElevenLabs RAG - Disconnect error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect from ElevenLabs';
      setError(errorMessage);
    }
  }, [conversation]);

  const toggleConnection = useCallback(() => {
    console.log('🎤 ElevenLabs RAG - Toggle connection requested, current status:', conversation.status);
    
    if (conversation.status === 'connected') {
      disconnect();
    } else if (conversation.status === 'disconnected') {
      connect();
    } else {
      console.log('🎤 ElevenLabs RAG - Connection in progress, ignoring toggle');
    }
  }, [conversation.status, connect, disconnect]);

  // Manual tool execution for testing
  const executeManualTool = useCallback(async (toolName: string, parameters: JsonValue): Promise<ToolResult> => {
    if (!meetingContext || !clientTools) {
      console.error('Meeting context or client tools not available for tool execution');
      return { success: false, error: 'Meeting context or client tools not available' };
    }

    const tool = clientTools[toolName as keyof typeof clientTools];
    if (!tool) {
      console.error(`Tool ${toolName} not found in clientTools`);
      return { success: false, error: `Tool ${toolName} not found` };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await tool(parameters as any);
      setLastToolCall({ name: toolName, parameters: parameters as Record<string, JsonValue> });
      return { success: true, data: result as JsonValue };
    } catch (error) {
      console.error('Manual tool execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }, [meetingContext, clientTools]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('🎤 ElevenLabs RAG - Hook cleanup on unmount');
      if (conversation.status === 'connected') {
        conversation.endSession().catch(console.error);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Log status changes (but don't cause re-renders)
  useEffect(() => {
    console.log('🎤 ElevenLabs RAG - Status update:', {
      status: conversation.status,
      isConnected: conversation.status === 'connected',
      isListening: conversation.isSpeaking === false && conversation.status === 'connected',
      isSpeaking: conversation.isSpeaking,
      isSDKReady,
      hasError: !!error,
      hasClientTools: !!meetingContext,
      lastToolCall: lastToolCall?.name
    });
  }, [conversation.status, conversation.isSpeaking, isSDKReady, error, meetingContext, lastToolCall]);

  return {
    isConnected: conversation.status === 'connected',
    isListening: conversation.isSpeaking === false && conversation.status === 'connected',
    isSDKReady,
    error,
    connect,
    disconnect,
    toggleConnection,
    // RAG-specific features
    lastToolCall,
    executeManualTool,
    availableTools: meetingContext && clientTools ? Object.keys(clientTools) : [],
    // Expose additional conversation properties for debugging
    conversationStatus: conversation.status,
    isSpeaking: conversation.isSpeaking
  };
};