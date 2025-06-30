import { useEffect, useState, useCallback, useRef } from 'react';
import { meetingService, knowledgeService, realtimeService } from '../lib/supabase';
import { type MeetingKnowledge, type MeetingParticipant } from '../types/types';
import { useKnowledgePolling } from './useKnowledgePolling';

interface UseSupabaseSyncProps {
  meetingId: string;
  userId: string;
  userName: string;
  getToken?: () => Promise<string | null>;
}

export const useSupabaseSync = ({ meetingId, userId, userName, getToken }: UseSupabaseSyncProps) => {
  const [knowledge, setKnowledge] = useState<MeetingKnowledge[]>([]);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const initializationRef = useRef(false);
  const participantCreatedRef = useRef(false);

  // Polling for knowledge processing updates
  const { isPolling, processingCount, processedCount } = useKnowledgePolling({
    meetingId,
    currentKnowledge: knowledge,
    onKnowledgeUpdate: setKnowledge,
    getToken,
    enabled: isConnected
  });

  // Initialize meeting and participant
  const initializeMeeting = useCallback(async () => {
    // Prevent multiple initializations
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      console.log('Initializing meeting:', meetingId);
      
      // Try to get existing meeting
      const meeting = await meetingService.getMeeting(meetingId);
      
      // If meeting doesn't exist, create it
      if (meeting === null) {
        console.log('Creating new meeting:', meetingId);
        await meetingService.createMeeting({
          id: meetingId,
          name: `Meeting ${meetingId}`,
          host_id: userId
        });
      } else {
        console.log('Meeting exists:', meeting);
      }

      // Add participant to meeting (uses upsert, so safe to call multiple times)
      console.log('Adding participant:', { meetingId, userId, userName });
      await meetingService.addParticipant({
        meeting_id: meetingId,
        user_name: userName,
        user_id: userId
      }, getToken);
      
      // Mark participant as successfully created
      participantCreatedRef.current = true;

      // Load existing knowledge
      const existingKnowledge = await knowledgeService.getMeetingKnowledge(meetingId, undefined, getToken);
      setKnowledge(existingKnowledge);

      // Load existing participants
      const existingParticipants = await meetingService.getMeetingParticipants(meetingId, getToken);
      setParticipants(existingParticipants);

      setIsConnected(true);
      console.log('Meeting initialization complete');
    } catch (error) {
      console.error('Error initializing meeting:', error);
      initializationRef.current = false; // Reset on error to allow retry
    }
  }, [meetingId, userId, userName, getToken]);

  // Add knowledge to meeting
  const addKnowledge = useCallback(async (
    content: string,
    contentType: MeetingKnowledge['content_type'] = 'fact',
    source: MeetingKnowledge['source'] = 'user'
  ) => {
    try {
      await knowledgeService.addKnowledge({
        meeting_id: meetingId,
        content,
        content_type: contentType,
        source
      }, getToken);
      
      // Refresh knowledge list after adding new knowledge
      // (needed because real-time subscriptions don't work with RLS auth)
      const updatedKnowledge = await knowledgeService.getMeetingKnowledge(meetingId, undefined, getToken);
      setKnowledge(updatedKnowledge);
    } catch (error) {
      console.error('Error adding knowledge:', error);
    }
  }, [meetingId, getToken]);

  // Update participant status
  const updateParticipantStatus = useCallback(async (isConnected: boolean) => {
    // Only update status if participant was successfully created
    if (!participantCreatedRef.current && !isConnected) {
      console.log('Skipping status update - participant not yet created');
      return;
    }
    
    try {
      await meetingService.updateParticipantStatus(userId, meetingId, isConnected, getToken);
    } catch (error) {
      console.error('Error updating participant status:', error);
    }
  }, [userId, meetingId, getToken]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isConnected) return;

    console.log('Setting up real-time subscriptions for meeting:', meetingId);

    // Subscribe to knowledge updates
    const knowledgeSubscription = knowledgeService.subscribeToKnowledgeUpdates(
      meetingId,
      (payload) => {
        console.log('Knowledge update:', payload);
        
        if (payload.eventType === 'INSERT' && payload.new) {
          setKnowledge(prev => [...prev, payload.new as MeetingKnowledge]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setKnowledge(prev => 
            prev.map(item => 
              item.id === payload.new!.id ? payload.new as MeetingKnowledge : item
            )
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setKnowledge(prev => 
            prev.filter(item => item.id !== payload.old!.id)
          );
        }
      }
    );

    // Subscribe to participant updates
    const participantSubscription = realtimeService.subscribeToParticipants(
      meetingId,
      (payload) => {
        console.log('Participant update:', payload);
        
        if (payload.eventType === 'INSERT' && payload.new) {
          setParticipants(prev => [...prev, payload.new as MeetingParticipant]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setParticipants(prev => 
            prev.map(item => 
              item.id === payload.new!.id ? payload.new as MeetingParticipant : item
            )
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setParticipants(prev => 
            prev.filter(item => item.id !== payload.old!.id)
          );
        }
      }
    );

    return () => {
      console.log('Cleaning up real-time subscriptions');
      knowledgeSubscription.unsubscribe();
      participantSubscription.unsubscribe();
    };
  }, [meetingId, isConnected]);

  // Initialize on mount
  useEffect(() => {
    initializeMeeting();

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up Supabase sync');
      updateParticipantStatus(false);
    };
  }, [initializeMeeting, updateParticipantStatus]);

  return {
    knowledge,
    participants,
    isConnected,
    addKnowledge,
    updateParticipantStatus,
    // Polling state for UI feedback
    isPolling,
    processingCount,
    processedCount
  };
};