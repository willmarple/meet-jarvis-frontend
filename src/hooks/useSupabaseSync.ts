import { useEffect, useState, useCallback, useRef } from 'react';
import { meetingService, knowledgeService, realtimeService, type MeetingKnowledge, type MeetingParticipant } from '../lib/supabase';

interface UseSupabaseSyncProps {
  meetingId: string;
  userId: string;
  userName: string;
}

export const useSupabaseSync = ({ meetingId, userId, userName }: UseSupabaseSyncProps) => {
  const [knowledge, setKnowledge] = useState<MeetingKnowledge[]>([]);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const initializationRef = useRef(false);

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
      });

      // Load existing knowledge
      const existingKnowledge = await knowledgeService.getMeetingKnowledge(meetingId);
      setKnowledge(existingKnowledge);

      // Load existing participants
      const existingParticipants = await meetingService.getMeetingParticipants(meetingId);
      setParticipants(existingParticipants);

      setIsConnected(true);
      console.log('Meeting initialization complete');
    } catch (error) {
      console.error('Error initializing meeting:', error);
      initializationRef.current = false; // Reset on error to allow retry
    }
  }, [meetingId, userId, userName]);

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
      });
    } catch (error) {
      console.error('Error adding knowledge:', error);
    }
  }, [meetingId]);

  // Update participant status
  const updateParticipantStatus = useCallback(async (isConnected: boolean) => {
    try {
      await meetingService.updateParticipantStatus(userId, meetingId, isConnected);
    } catch (error) {
      console.error('Error updating participant status:', error);
    }
  }, [userId, meetingId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isConnected) return;

    console.log('Setting up real-time subscriptions for meeting:', meetingId);

    // Subscribe to knowledge updates
    const knowledgeSubscription = knowledgeService.subscribeToKnowledgeUpdates(
      meetingId,
      (payload) => {
        console.log('Knowledge update:', payload);
        
        if (payload.eventType === 'INSERT') {
          setKnowledge(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setKnowledge(prev => 
            prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setKnowledge(prev => 
            prev.filter(item => item.id !== payload.old.id)
          );
        }
      }
    );

    // Subscribe to participant updates
    const participantSubscription = realtimeService.subscribeToParticipants(
      meetingId,
      (payload) => {
        console.log('Participant update:', payload);
        
        if (payload.eventType === 'INSERT') {
          setParticipants(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setParticipants(prev => 
            prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setParticipants(prev => 
            prev.filter(item => item.id !== payload.old.id)
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
    updateParticipantStatus
  };
};