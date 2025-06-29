import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useConversation } from '@elevenlabs/react';

interface KnowledgeItem {
  id: string;
  content: string;
  [key: string]: unknown;
}

interface ElevenLabsMessage {
  type?: string;
  source?: string;
  message?: string;
  tool_name?: string;
  parameters?: Record<string, unknown>;
}

interface UseElevenLabsVoiceProps {
  onResponse?: (response: string) => void;
  onTranscription?: (text: string) => void;
  meetingContext?: {
    meetingId: string;
    participants: string[];
    existingKnowledge: KnowledgeItem[];
  };
}

export const useElevenLabsVoice = ({ 
  onResponse, 
  onTranscription,
  meetingContext 
}: UseElevenLabsVoiceProps = {}) => {
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializationRef = useRef(false);
  const connectionAttemptRef = useRef(false);

  // Get agent ID from environment
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;

  // Memoize the meeting context to prevent unnecessary re-renders
  const stableMeetingContext = useMemo(() => {
    if (!meetingContext) return null;
    return {
      meetingId: meetingContext.meetingId,
      participantCount: meetingContext.participants.length,
      knowledgeCount: meetingContext.existingKnowledge.length
    };
  }, [meetingContext?.meetingId, meetingContext?.participants.length, meetingContext?.existingKnowledge.length]); // eslint-disable-line react-hooks/exhaustive-deps

  console.log('🎤 ElevenLabs Hook - Initializing with:', {
    agentId: agentId ? `${agentId.substring(0, 8)}...` : 'NOT SET',
    hasOnResponse: !!onResponse,
    hasOnTranscription: !!onTranscription,
    meetingContext: stableMeetingContext
  });

  // Validate agent ID
  useEffect(() => {
    if (!agentId) {
      const errorMsg = 'VITE_ELEVENLABS_AGENT_ID not found in environment variables';
      console.error('🎤 ElevenLabs Hook - Configuration Error:', errorMsg);
      setError(errorMsg);
      return;
    }

    console.log('🎤 ElevenLabs Hook - Agent ID configured successfully');
    setIsSDKReady(true);
    setError(null);
  }, [agentId]);

  // Enhanced message callback with RAG context
  const onMessageCallback = useCallback(async (message: unknown) => {
    const msg = message as ElevenLabsMessage;
    console.log('🎤 ElevenLabs - Message received:', {
      type: msg.type,
      source: msg.source,
      message: msg.message?.substring(0, 100) + ((msg.message?.length ?? 0) > 100 ? '...' : ''),
      timestamp: new Date().toISOString()
    });

    // Handle user transcriptions
    if (msg.source === 'user' && msg.message && onTranscription) {
      console.log('🎤 ElevenLabs - Processing user transcription');
      onTranscription(msg.message);

      // Note: AI context building now happens through the ElevenLabsRAG hook
      // with clientTools integration for knowledge access
      console.log('🎤 ElevenLabs - User input received, context handled by RAG system');
    } 
    // Handle AI responses
    else if (msg.source === 'ai' && msg.message && onResponse) {
      console.log('🎤 ElevenLabs - Processing AI response');
      onResponse(msg.message);
    }
  }, [onTranscription, onResponse]);

  // Stable callback refs to prevent re-renders
  const onConnectCallback = useCallback(() => {
    console.log('🎤 ElevenLabs - Connected successfully');
    connectionAttemptRef.current = false;
  }, []);

  const onDisconnectCallback = useCallback(() => {
    console.log('🎤 ElevenLabs - Disconnected');
    connectionAttemptRef.current = false;
    initializationRef.current = false;
  }, []);

  const onErrorCallback = useCallback((error: unknown) => {
    console.error('🎤 ElevenLabs - Error occurred:', error);
    const errorMessage = error instanceof Error ? error.message : 'ElevenLabs conversation error';
    setError(errorMessage);
    connectionAttemptRef.current = false;
    initializationRef.current = false;
  }, []);

  const onStatusChangeCallback = useCallback((status: unknown) => {
    console.log('🎤 ElevenLabs - Status changed:', status);
  }, []);

  // Use the ElevenLabs conversation hook with stable callbacks
  const conversation = useConversation({
    onConnect: onConnectCallback,
    onDisconnect: onDisconnectCallback,
    onMessage: onMessageCallback,
    onError: onErrorCallback,
    onStatusChange: onStatusChangeCallback
  });

  const connect = useCallback(async () => {
    if (!isSDKReady) {
      const errorMsg = 'SDK not ready - check agent ID configuration';
      console.error('🎤 ElevenLabs - Connect failed:', errorMsg);
      setError(errorMsg);
      return;
    }

    if (conversation.status === 'connected') {
      console.log('🎤 ElevenLabs - Already connected, skipping');
      return;
    }

    if (connectionAttemptRef.current) {
      console.log('🎤 ElevenLabs - Connection already in progress');
      return;
    }

    try {
      console.log('🎤 ElevenLabs - Starting connection process...');
      connectionAttemptRef.current = true;
      initializationRef.current = true;
      setError(null);

      // Prepare initial context for the AI agent
      if (meetingContext) {
        console.log(`Meeting Context: ${meetingContext.meetingId} with ${meetingContext.participants.length} participants. ${meetingContext.existingKnowledge.length} knowledge items available.`);
      }

      // Start the conversation
      await conversation.startSession({
        agentId: agentId!,
        // Note: Initial context injection would depend on ElevenLabs API capabilities
      });

      console.log('🎤 ElevenLabs - Connection initiated successfully');
    } catch (error: unknown) {
      console.error('🎤 ElevenLabs - Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to ElevenLabs';
      setError(errorMessage);
      connectionAttemptRef.current = false;
      initializationRef.current = false;
    }
  }, [isSDKReady, agentId, conversation, meetingContext]);

  const disconnect = useCallback(async () => {
    if (conversation.status === 'disconnected') {
      console.log('🎤 ElevenLabs - Already disconnected, skipping');
      return;
    }

    try {
      console.log('🎤 ElevenLabs - Disconnecting...');
      await conversation.endSession();
      console.log('🎤 ElevenLabs - Disconnected successfully');
      setError(null);
    } catch (error: unknown) {
      console.error('🎤 ElevenLabs - Disconnect error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect from ElevenLabs';
      setError(errorMessage);
    }
  }, [conversation]);

  const toggleConnection = useCallback(() => {
    console.log('🎤 ElevenLabs - Toggle connection requested, current status:', conversation.status);
    
    if (conversation.status === 'connected') {
      disconnect();
    } else if (conversation.status === 'disconnected') {
      connect();
    } else {
      console.log('🎤 ElevenLabs - Connection in progress, ignoring toggle');
    }
  }, [conversation.status, connect, disconnect]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('🎤 ElevenLabs - Hook cleanup on unmount');
      if (conversation.status === 'connected') {
        conversation.endSession().catch(console.error);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Log status changes (but don't cause re-renders)
  useEffect(() => {
    console.log('🎤 ElevenLabs - Status update:', {
      status: conversation.status,
      isConnected: conversation.status === 'connected',
      isListening: conversation.isSpeaking === false && conversation.status === 'connected',
      isSpeaking: conversation.isSpeaking,
      isSDKReady,
      hasError: !!error
    });
  }, [conversation.status, conversation.isSpeaking, isSDKReady, error]);

  return {
    isConnected: conversation.status === 'connected',
    isListening: conversation.isSpeaking === false && conversation.status === 'connected',
    isSDKReady,
    error,
    connect,
    disconnect,
    toggleConnection,
    // Expose additional conversation properties for debugging
    conversationStatus: conversation.status,
    isSpeaking: conversation.isSpeaking
  };
};