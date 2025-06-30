import React from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSupabaseSync } from '../hooks/useSupabaseSync';
import { useElevenLabsVoiceRAG } from '../hooks/useElevenLabsVoiceRAG';
import { VideoGrid } from './VideoGrid';
import { MeetingControls } from './MeetingControls';
import { KnowledgePanel } from './KnowledgePanel';
import { AIToolsPanel } from './AIToolsPanel';
import { UserMenu } from './UserMenu';
import { Copy, CheckCircle, Brain, Mic, Sparkles, Wrench, AlertCircle, User as UserIcon, Shield } from 'lucide-react';
import { User } from '../types/index';

interface MeetingRoomProps {
  roomId: string;
  userName: string;
  userId: string;
  onLeave: () => void;
  user?: User | null;
  isSignedIn?: boolean;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  roomId,
  userName,
  userId,
  onLeave,
  isSignedIn
}) => {
  const { getToken } = useAuth();
  const [copied, setCopied] = React.useState(false);
  const [showKnowledgePanel, setShowKnowledgePanel] = React.useState(false);
  const [showAIToolsPanel, setShowAIToolsPanel] = React.useState(false);
  const [testingTools, setTestingTools] = React.useState(false);
  
  const {
    participants,
    localStream,
    localVideoRef,
    isAudioEnabled,
    isVideoEnabled,
    isConnected,
    toggleAudio,
    toggleVideo,
    leaveRoom
  } = useWebRTC({ roomId, userName, userId });

  const {
    knowledge,
    isConnected: isSupabaseConnected,
    addKnowledge,
    updateParticipantStatus,
    isPolling,
    processingCount,
    processedCount
  } = useSupabaseSync({ meetingId: roomId, userId, userName, getToken });

  const {
    isConnected: isVoiceConnected,
    isListening,
    isSDKReady,
    toggleConnection,
    error: voiceError,
    conversationStatus,
    isSpeaking,
    lastToolCall,
    executeManualTool,
    availableTools
  } = useElevenLabsVoiceRAG({
    onResponse: (response) => {
      console.log('🎤 Meeting Room - AI Response received:', response.substring(0, 100) + '...');
      // DO NOT store AI responses in knowledge base - only store human participant contributions
    },
    onTranscription: (transcription) => {
      console.log('🎤 Meeting Room - User transcription received:', transcription.substring(0, 100) + '...');
      // DO NOT automatically store transcriptions - many are just queries to the AI agent
      // Users should manually add important meeting content through the knowledge panel
    },
    onToolCall: (toolCall, result) => {
      console.log('🎤 Meeting Room - AI Tool Call executed:', toolCall.name, result);
      // DO NOT store AI tool call results in knowledge base - they are agent responses, not meeting content
    },
    meetingContext: {
      meetingId: roomId,
      participants: participants.map(p => p.name),
      existingKnowledge: knowledge.map(k => ({ id: k.id, content: k.content }))
    },
    getToken
  });

  const handleLeave = () => {
    leaveRoom();
    updateParticipantStatus(false);
    if (isVoiceConnected) {
      toggleConnection();
    }
    onLeave();
  };

  const copyMeetingLink = async () => {
    const meetingLink = `${window.location.origin}?room=${roomId}`;
    try {
      await navigator.clipboard.writeText(meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy meeting link:', error);
    }
  };

  const handleVoiceAI = () => {
    console.log('🎤 Meeting Room - Voice AI button clicked', {
      isSDKReady,
      conversationStatus,
      isVoiceConnected,
      hasError: !!voiceError
    });
    
    toggleConnection();
  };

  // Test AI tools functionality
  const testAITools = async () => {
    if (availableTools.length === 0) {
      console.error('AI Tools not available');
      return;
    }

    setTestingTools(true);
    try {
      console.log('🔧 Testing AI Tools...');
      
      // Test search functionality
      const searchResult = await executeManualTool('search_meeting_knowledge', {
        query: 'performance issues',
        limit: 3
      });
      
      console.log('🔧 Search test result:', searchResult);
      
      
      // DO NOT add test results to knowledge base - these are system tests, not meeting content
      
    } catch (error) {
      console.error('🔧 AI Tools test failed:', error);
    } finally {
      setTestingTools(false);
    }
  };

  // Use processedCount from polling hook (replaces local calculation)
  const aiEnhancedCount = processedCount;

  // Log voice AI state changes
  React.useEffect(() => {
    console.log('🎤 Meeting Room - Voice AI state changed:', {
      isSDKReady,
      conversationStatus,
      isVoiceConnected,
      isListening,
      isSpeaking,
      error: voiceError,
      toolsAvailable: availableTools.length,
      lastToolCall: lastToolCall?.name
    });
  }, [isSDKReady, conversationStatus, isVoiceConnected, isListening, isSpeaking, voiceError, availableTools.length, lastToolCall]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to meeting...</p>
          {isSupabaseConnected && (
            <p className="text-green-400 text-sm mt-2">✓ Knowledge base connected</p>
          )}
          {isSDKReady && (
            <p className="text-purple-400 text-sm mt-1">✓ Voice AI SDK ready</p>
          )}
          {availableTools.length > 0 && (
            <p className="text-blue-400 text-sm mt-1">✓ {availableTools.length} AI tools available</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-white text-xl font-semibold">Meeting Room</h1>
            <span className="bg-gray-700 px-3 py-1 rounded-full text-gray-300 text-sm font-mono">
              {roomId}
            </span>
            
            {/* Auth Status */}
            {isSignedIn ? (
              <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Authenticated
              </span>
            ) : (
              <span className="bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                Guest Mode
              </span>
            )}
            
            {isSupabaseConnected && (
              <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded-full text-xs">
                Knowledge Base Active
              </span>
            )}
            {isVoiceConnected && (
              <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                Voice AI Active
              </span>
            )}
            {isSDKReady && !isVoiceConnected && (
              <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full text-xs">
                Voice AI Ready
              </span>
            )}
            {aiEnhancedCount > 0 && (
              <span className="bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {aiEnhancedCount} AI Enhanced
              </span>
            )}
            {availableTools.length > 0 && (
              <span className="bg-indigo-600/20 text-indigo-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                {availableTools.length} Tools
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleVoiceAI}
              disabled={!isSDKReady}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                !isSDKReady
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : isVoiceConnected 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
              }`}
              title={
                !isSDKReady 
                  ? 'Voice AI SDK not ready - check configuration' 
                  : isVoiceConnected 
                    ? `End Voice AI conversation (${conversationStatus})` 
                    : 'Start Voice AI conversation'
              }
            >
              <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
              {!isSDKReady ? 'SDK Loading...' : 
               conversationStatus === 'connecting' ? 'Connecting...' :
               isVoiceConnected ? 'End Voice AI' : 'Voice AI'}
            </button>

            <button
              onClick={() => setShowAIToolsPanel(!showAIToolsPanel)}
              disabled={availableTools.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                availableTools.length === 0
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : showAIToolsPanel 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={availableTools.length > 0 ? 'Open AI Tools Panel' : 'AI Tools not available'}
            >
              <Wrench className="w-4 h-4" />
              AI Tools ({availableTools.length})
              {lastToolCall && (
                <span className="bg-green-500/20 text-green-400 px-1 py-0.5 rounded text-xs">
                  {lastToolCall.name}
                </span>
              )}
            </button>

            {/* Test AI Tools Button */}
            <button
              onClick={testAITools}
              disabled={availableTools.length === 0 || testingTools}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                availableTools.length === 0
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : testingTools
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-700 hover:bg-orange-600 text-orange-300'
              }`}
              title="Test AI Tools functionality"
            >
              {testingTools ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testing...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Test Tools
                </>
              )}
            </button>
            
            <button
              onClick={() => setShowKnowledgePanel(!showKnowledgePanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showKnowledgePanel 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <Brain className="w-4 h-4" />
              Knowledge ({knowledge.length})
              {aiEnhancedCount > 0 && (
                <span className="bg-yellow-500/20 text-yellow-400 px-1 py-0.5 rounded text-xs">
                  {aiEnhancedCount} AI
                </span>
              )}
            </button>
            
            <button
              onClick={copyMeetingLink}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Share Link
                </>
              )}
            </button>

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
        
        {/* Voice AI Status */}
        {voiceError && (
          <div className="px-6 py-2 bg-red-600/20 border-t border-red-600/30">
            <p className="text-red-400 text-sm">Voice AI Error: {voiceError}</p>
          </div>
        )}
        
        {isVoiceConnected && (
          <div className="px-6 py-2 bg-purple-600/20 border-t border-purple-600/30">
            <p className="text-purple-400 text-sm flex items-center gap-2">
              <Mic className={`w-3 h-3 ${isListening ? 'animate-pulse' : ''}`} />
              {isSpeaking ? 'AI is speaking...' : 
               isListening ? 'Listening for your question...' : 
               'Voice AI ready - start speaking'}
              {availableTools.length > 0 && (
                <span className="ml-2 text-xs">
                  | {availableTools.length} tools available
                </span>
              )}
            </p>
          </div>
        )}
        
        {/* Auth Warning for Guests */}
        {!isSignedIn && (
          <div className="px-6 py-2 bg-yellow-600/20 border-t border-yellow-600/30">
            <p className="text-yellow-400 text-sm flex items-center gap-2">
              <UserIcon className="w-3 h-3" />
              Guest Mode: Some features may be limited. Sign in for full access.
            </p>
          </div>
        )}
        
        {/* RAG Status */}
        {aiEnhancedCount > 0 && (
          <div className="px-6 py-2 bg-yellow-600/20 border-t border-yellow-600/30">
            <p className="text-yellow-400 text-sm flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              RAG System Active: {aiEnhancedCount} knowledge items enhanced with AI embeddings
            </p>
          </div>
        )}
        
        {/* AI Tools Status */}
        {lastToolCall && (
          <div className="px-6 py-2 bg-indigo-600/20 border-t border-indigo-600/30">
            <p className="text-indigo-400 text-sm flex items-center gap-2">
              <Wrench className="w-3 h-3" />
              Last AI Tool Call: {lastToolCall.name} with {Object.keys(lastToolCall.parameters).length} parameters
            </p>
          </div>
        )}
        
        {/* Testing Status */}
        {testingTools && (
          <div className="px-6 py-2 bg-orange-600/20 border-t border-orange-600/30">
            <p className="text-orange-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Testing AI Tools functionality...
            </p>
          </div>
        )}
        
        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-6 py-1 bg-gray-800/50 border-t border-gray-700/30">
            <p className="text-gray-400 text-xs">
              Debug: SDK Ready: {isSDKReady ? '✓' : '✗'} | 
              Status: {conversationStatus} | 
              Connected: {isVoiceConnected ? '✓' : '✗'} | 
              Listening: {isListening ? '✓' : '✗'} | 
              Speaking: {isSpeaking ? '✓' : '✗'} |
              AI Enhanced: {processedCount}/{knowledge.length} |
              Processing: {processingCount} |
              Polling: {isPolling ? '✓' : '✗'} |
              Tools: {availableTools.length} |
              Auth: {isSignedIn ? 'Signed In' : 'Guest'}
            </p>
          </div>
        )}
      </div>

      {/* Video Grid */}
      <div className={`pt-20 pb-32 h-screen ${
        isVoiceConnected || aiEnhancedCount > 0 || lastToolCall || testingTools || !isSignedIn ? 'pt-32' : 'pt-20'
      }`}>
        <VideoGrid
          participants={participants}
          localStream={localStream}
          localVideoRef={localVideoRef}
          currentUserName={userName}
          isLocalAudioEnabled={isAudioEnabled}
          isLocalVideoEnabled={isVideoEnabled}
        />
      </div>

      {/* Meeting Controls */}
      <MeetingControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onLeaveRoom={handleLeave}
        participantCount={participants.length + 1}
      />

      {/* AI Tools Panel */}
      <AIToolsPanel
        tools={availableTools.map(name => {
          // Define proper parameters for each tool
          const toolConfigs = {
            search_meeting_knowledge: {
              name,
              description: 'Search meeting knowledge using semantic search',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query text' },
                  content_type: { 
                    type: 'string', 
                    description: 'Filter by content type',
                    enum: ['fact', 'context', 'summary', 'question', 'answer']
                  },
                  limit: { type: 'number', description: 'Maximum number of results (default: 10)' }
                },
                required: ['query']
              }
            },
            recall_decisions: {
              name,
              description: 'Recall specific decisions made in meetings',
              parameters: {
                type: 'object',
                properties: {
                  topic: { 
                    type: 'string', 
                    description: 'Topic or subject area to search for decisions about (e.g., "REST API authentication", "Acme Industries JWT tokens")'
                  }
                },
                required: ['topic']
              }
            },
            summarize_topic: {
              name,
              description: 'Generate a summary of discussions on a specific topic',
              parameters: {
                type: 'object',
                properties: {
                  topic: { 
                    type: 'string', 
                    description: 'Topic to summarize (e.g., "authentication decisions", "project requirements")'
                  }
                },
                required: ['topic']
              }
            },
          };
          
          return toolConfigs[name as keyof typeof toolConfigs] || {
            name,
            description: `AI tool: ${name}`,
            parameters: { type: 'object', properties: {}, required: [] }
          };
        })}
        onExecuteTool={executeManualTool}
        lastToolCall={lastToolCall}
        isVisible={showAIToolsPanel}
        onClose={() => setShowAIToolsPanel(false)}
      />

      {/* Enhanced Knowledge Panel with RAG */}
      <KnowledgePanel
        knowledge={knowledge}
        onAddKnowledge={addKnowledge}
        isVisible={showKnowledgePanel}
        onClose={() => setShowKnowledgePanel(false)}
        meetingId={roomId}
      />
    </div>
  );
};