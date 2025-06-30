import { useEffect, useRef, useCallback } from 'react';
import { knowledgeService } from '../lib/supabase';
import { type MeetingKnowledge } from '../types/types';

interface UseKnowledgePollingProps {
  meetingId: string;
  currentKnowledge: MeetingKnowledge[];
  onKnowledgeUpdate: (updatedKnowledge: MeetingKnowledge[]) => void;
  getToken?: () => Promise<string | null>;
  enabled?: boolean;
}

/**
 * Hook to poll for knowledge processing updates
 * 
 * Polls every 15 seconds when there are knowledge items in processing state
 * (items with null embedding, keywords, or summary fields)
 */
export const useKnowledgePolling = ({
  meetingId,
  currentKnowledge,
  onKnowledgeUpdate,
  getToken,
  enabled = true
}: UseKnowledgePollingProps) => {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Helper to check if a knowledge item is still being processed
  const isProcessing = useCallback((item: MeetingKnowledge): boolean => {
    // An item is processing if it lacks embedding, keywords, or summary
    return !item.embedding || !item.keywords || item.keywords.length === 0 || !item.summary;
  }, []);

  // Helper to count processing items
  const getProcessingCount = useCallback((knowledge: MeetingKnowledge[]): number => {
    return knowledge.filter(item => isProcessing(item)).length;
  }, [isProcessing]);

  // Polling function to check for updates
  const pollForUpdates = useCallback(async () => {
    if (isPollingRef.current || !enabled) return;
    
    try {
      isPollingRef.current = true;
      console.log('Polling for knowledge processing updates...');
      
      // Fetch current knowledge state
      const updatedKnowledge = await knowledgeService.getMeetingKnowledge(meetingId, undefined, getToken);
      
      // Check if any items have changed from processing to processed
      const currentProcessingCount = getProcessingCount(currentKnowledge);
      const updatedProcessingCount = getProcessingCount(updatedKnowledge);
      
      // If processing count decreased or content changed, update
      if (currentProcessingCount !== updatedProcessingCount || 
          JSON.stringify(currentKnowledge) !== JSON.stringify(updatedKnowledge)) {
        console.log(`Knowledge processing update detected: ${currentProcessingCount} -> ${updatedProcessingCount} processing items`);
        onKnowledgeUpdate(updatedKnowledge);
      }
    } catch (error) {
      console.error('Error polling for knowledge updates:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [meetingId, currentKnowledge, onKnowledgeUpdate, getToken, enabled, getProcessingCount]);

  // Start/stop polling based on processing state
  useEffect(() => {
    if (!enabled) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const processingCount = getProcessingCount(currentKnowledge);
    
    if (processingCount > 0) {
      // Start polling if we have items being processed
      if (!pollIntervalRef.current) {
        console.log(`Starting knowledge polling - ${processingCount} items processing`);
        pollIntervalRef.current = setInterval(pollForUpdates, 15000); // Poll every 15 seconds
        
        // Also poll immediately
        setTimeout(pollForUpdates, 1000);
      }
    } else {
      // Stop polling if no items are being processed
      if (pollIntervalRef.current) {
        console.log('Stopping knowledge polling - all items processed');
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [currentKnowledge, enabled, pollForUpdates, getProcessingCount]);

  return {
    isPolling: pollIntervalRef.current !== null,
    processingCount: getProcessingCount(currentKnowledge),
    processedCount: currentKnowledge.length - getProcessingCount(currentKnowledge)
  };
};