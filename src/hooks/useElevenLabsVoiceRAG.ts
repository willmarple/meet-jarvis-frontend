import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useConversation } from '@elevenlabs/react';
import { 
  useSearchMeetingKnowledge, 
  useRecallDecisions, 
  useGetActionItems, 
  useSummarizeTopic, 
  useFindSimilarDiscussions 
} from './useAITools';

interface KnowledgeItem {
  id: string;
  content: string;
  [key: string]: unknown;
}

interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
}

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
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
    const msg = message as any;
    console.log('🎤 ElevenLabs RAG - Message received:', {
      type: msg.type,
      source: msg.source,
      message: msg.message?.substring(0, 100) + (msg.message?.length > 100 ? '...' : ''),
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
        name: msg.tool_name,
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
    setError((error as any)?.message || 'ElevenLabs conversation error');
    connectionAttemptRef.current = false;
    initializationRef.current = false;
  }, []);

  const onStatusChangeCallback = useCallback((status: unknown) => {
    console.log('🎤 ElevenLabs RAG - Status changed:', status);
  }, []);

  // Create client tools configuration for ElevenLabs
  const clientTools = useMemo(() => {
    if (!meetingContext) return {};
    
    return {
      search_meeting_knowledge: async (parameters: { query: string; content_type?: string; limit?: number }) => {
        try {
          console.log('🔧 Executing search_meeting_knowledge:', parameters);
          const result = await searchKnowledgeMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          return result;
        } catch (error) {
          console.error('🔧 Tool execution failed - search_meeting_knowledge:', error);
          throw error;
        }
      },
      
      recall_decisions: async (parameters: { topic: string }) => {
        try {
          console.log('🔧 Executing recall_decisions:', parameters);
          const result = await recallDecisionsMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          return result;
        } catch (error) {
          console.error('🔧 Tool execution failed - recall_decisions:', error);
          throw error;
        }
      },
      
      get_action_items: async (parameters: { assignee?: string; status?: string }) => {
        try {
          console.log('🔧 Executing get_action_items:', parameters);
          const result = await getActionItemsMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          return result;
        } catch (error) {
          console.error('🔧 Tool execution failed - get_action_items:', error);
          throw error;
        }
      },
      
      summarize_topic: async (parameters: { topic: string }) => {
        try {
          console.log('🔧 Executing summarize_topic:', parameters);
          const result = await summarizeTopicMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          return result;
        } catch (error) {
          console.error('🔧 Tool execution failed - summarize_topic:', error);
          throw error;
        }
      },
      
      find_similar_discussions: async (parameters: { reference_text: string; scope?: string }) => {
        try {
          console.log('🔧 Executing find_similar_discussions:', parameters);
          const result = await findSimilarDiscussionsMutation.mutateAsync({
            params: parameters,
            meetingId: meetingContext.meetingId
          });
          return result;
        } catch (error) {
          console.error('🔧 Tool execution failed - find_similar_discussions:', error);
          throw error;
        }
      }
    };
  }, [
    meetingContext,
    searchKnowledgeMutation,
    recallDecisionsMutation,
    getActionItemsMutation,
    summarizeTopicMutation,
    findSimilarDiscussionsMutation
  ]);

  // Use the ElevenLabs conversation hook with client tools and stable callbacks
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
        const availableTools = Object.keys(clientTools);
        console.log(`Meeting Context: ${meetingContext.meetingId} with ${meetingContext.participants.length} participants. ${meetingContext.existingKnowledge.length} knowledge items available. Available tools: ${availableTools.join(', ')}.`);
      }

      // Start the conversation - tools are now configured via clientTools
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
  const executeManualTool = useCallback(async (toolName: string, parameters: unknown) => {
    if (!meetingContext) {
      console.error('Meeting context not available for tool execution');
      return null;
    }

    const tool = clientTools[toolName];
    if (!tool) {
      console.error(`Tool ${toolName} not found in clientTools`);
      return null;
    }

    try {
      const result = await tool(parameters);
      setLastToolCall({ name: toolName, parameters });
      return { success: true, data: result };
    } catch (error) {
      console.error('Manual tool execution error:', error);
      return { success: false, error: error.message };
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
    availableTools: meetingContext ? Object.keys(clientTools) : [],
    // Expose additional conversation properties for debugging
    conversationStatus: conversation.status,
    isSpeaking: conversation.isSpeaking
  };
};