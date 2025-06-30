import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Some features may not work.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Database Types
export type Meeting = {
  id: string;
  name: string;
  host_id: string;
  created_at: string;
  is_active: boolean;
};

export type MeetingParticipant = {
  id: string;
  meeting_id: string;
  user_name: string;
  user_id: string;
  joined_at: string;
  left_at?: string;
  is_connected: boolean;
};

export type MeetingKnowledge = {
  id: string;
  meeting_id: string;
  content: string;
  content_type: 'fact' | 'context' | 'summary' | 'question' | 'answer';
  source: 'user' | 'ai' | 'document';
  created_at: string;
  updated_at: string;
};

// Meeting Management Functions
export const meetingService = {
  // Create a new meeting
  async createMeeting(meetingData: { id: string; name: string; host_id: string }) {
    const { data, error } = await supabase
      .from('meetings')
      .insert([meetingData])
      .select()
      .single();
    
    if (error) throw error;
    return data as Meeting;
  },

  // Get meeting by ID - returns null if not found instead of throwing error
  async getMeeting(meetingId: string): Promise<Meeting | null> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no results
    
    if (error) throw error;
    return data as Meeting | null;
  },

  // Update meeting status
  async updateMeetingStatus(meetingId: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('meetings')
      .update({ is_active: isActive })
      .eq('id', meetingId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Meeting;
  },

  // Add participant to meeting using secure API
  async addParticipant(participantData: {
    meeting_id: string;
    user_name: string;
    user_id: string;
  }, getToken?: () => Promise<string | null>) {
    // Try to use secure API first (if authenticated)
    try {
      const { createAuthenticatedApiClient } = await import('../api/client');
      const authClient = await createAuthenticatedApiClient(getToken);
      
      const response = await authClient.post(`/secure/meetings/${participantData.meeting_id}/participants`, {
        user_name: participantData.user_name,
        user_id: participantData.user_id
      });
      
      if (response.data && !response.data.error) {
        return response.data as MeetingParticipant;
      }
      throw new Error(response.data?.error || 'Failed to add participant');
    } catch (apiError) {
      console.warn('Secure API failed, falling back to direct Supabase (will fail if RLS is enabled):', apiError);
      
      // Fallback to direct Supabase (for backward compatibility, but will likely fail due to RLS)
      const { data, error } = await supabase
        .from('meeting_participants')
        .upsert([{
          ...participantData,
          is_connected: true,
          joined_at: new Date().toISOString(),
          left_at: null
        }], {
          onConflict: 'meeting_id,user_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MeetingParticipant;
    }
  },

  // Update participant connection status using secure API
  async updateParticipantStatus(userId: string, meetingId: string, isConnected: boolean, getToken?: () => Promise<string | null>): Promise<void> {
    // Try to use secure API first (if authenticated)
    try {
      const { createAuthenticatedApiClient } = await import('../api/client');
      const authClient = await createAuthenticatedApiClient(getToken);
      
      const response = await authClient.put(`/secure/meetings/${meetingId}/participants/${userId}/status`, {
        is_connected: isConnected
      });
      
      if (response.data && !response.data.error) {
        return; // Success
      }
      throw new Error(response.data?.error || 'Failed to update participant status');
    } catch (apiError) {
      console.warn('Secure API failed, falling back to direct Supabase (will fail if RLS is enabled):', apiError);
      
      // Fallback to direct Supabase (for backward compatibility, but will likely fail due to RLS)
      const updateData: { is_connected: boolean; left_at?: string } = { is_connected: isConnected };
      if (!isConnected) {
        updateData.left_at = new Date().toISOString();
      }

      const { count, error } = await supabase
        .from('meeting_participants')
        .update(updateData)
        .eq('user_id', userId)
        .eq('meeting_id', meetingId);
      
      if (error) throw error;
      
      if (count === 0) {
        console.warn(`No participant found for user ${userId} in meeting ${meetingId}`);
      }
    }
  },

  // Get meeting participants using secure API
  async getMeetingParticipants(meetingId: string, getToken?: () => Promise<string | null>) {
    // Try to use secure API first (if authenticated)
    try {
      const { createAuthenticatedApiClient } = await import('../api/client');
      const authClient = await createAuthenticatedApiClient(getToken);
      
      const response = await authClient.get(`/secure/meetings/${meetingId}/participants`);
      
      if (response.data && !response.data.error) {
        return response.data as MeetingParticipant[];
      }
      throw new Error(response.data?.error || 'Failed to get participants');
    } catch (apiError) {
      console.warn('Secure API failed, falling back to direct Supabase (will fail if RLS is enabled):', apiError);
      
      // Fallback to direct Supabase (for backward compatibility, but will likely fail due to RLS)
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('is_connected', true);
      
      if (error) throw error;
      return data as MeetingParticipant[];
    }
  }
};

// Knowledge Base Functions
export const knowledgeService = {
  // Add knowledge to meeting using secure API
  async addKnowledge(knowledgeData: {
    meeting_id: string;
    content: string;
    content_type: MeetingKnowledge['content_type'];
    source: MeetingKnowledge['source'];
  }, getToken?: () => Promise<string | null>) {
    // Try to use secure API first (if authenticated)
    try {
      const { createAuthenticatedApiClient } = await import('../api/client');
      const authClient = await createAuthenticatedApiClient(getToken);
      const response = await authClient.post(`/secure/meetings/${knowledgeData.meeting_id}/knowledge`, {
        content: knowledgeData.content,
        content_type: knowledgeData.content_type,
        source: knowledgeData.source
      });
      
      if (response.data.success) {
        return response.data.data as MeetingKnowledge;
      }
      throw new Error(response.data.error || 'Failed to add knowledge');
    } catch (apiError) {
      console.warn('Secure API failed, falling back to direct Supabase (will fail if RLS is enabled):', apiError);
      
      // Fallback to direct Supabase (for backward compatibility, but will likely fail due to RLS)
      const { data, error } = await supabase
        .from('meeting_knowledge')
        .insert([{
          ...knowledgeData,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data as MeetingKnowledge;
    }
  },

  // Get meeting knowledge using secure API
  async getMeetingKnowledge(meetingId: string, contentType?: string, getToken?: () => Promise<string | null>) {
    // Try to use secure API first (if authenticated)
    try {
      const { createAuthenticatedApiClient } = await import('../api/client');
      const authClient = await createAuthenticatedApiClient(getToken);
      const response = await authClient.get(`/secure/meetings/${meetingId}/knowledge`);
      
      if (response.data.success) {
        let data = response.data.data as MeetingKnowledge[];
        
        // Apply content type filter if specified
        if (contentType) {
          data = data.filter(item => item.content_type === contentType);
        }
        
        return data;
      }
      throw new Error(response.data.error || 'Failed to get knowledge');
    } catch (apiError) {
      console.warn('Secure API failed, falling back to direct Supabase (will fail if RLS is enabled):', apiError);
      
      // Fallback to direct Supabase (for backward compatibility, but will likely fail due to RLS)
      let query = supabase
        .from('meeting_knowledge')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });
      
      if (contentType) {
        query = query.eq('content_type', contentType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MeetingKnowledge[];
    }
  },

  // Update knowledge
  async updateKnowledge(knowledgeId: string, updates: Partial<MeetingKnowledge>) {
    const { data, error } = await supabase
      .from('meeting_knowledge')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', knowledgeId)
      .select()
      .single();
    
    if (error) throw error;
    return data as MeetingKnowledge;
  },

  // Subscribe to knowledge updates
  subscribeToKnowledgeUpdates(meetingId: string, callback: (payload: { new?: MeetingKnowledge; old?: MeetingKnowledge; eventType: string }) => void) {
    return supabase
      .channel(`meeting_knowledge:${meetingId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'meeting_knowledge',
          filter: `meeting_id=eq.${meetingId}`
        },
        callback
      )
      .subscribe();
  }
};

// Real-time subscriptions
export const realtimeService = {
  // Subscribe to participant updates
  subscribeToParticipants(meetingId: string, callback: (payload: { new?: MeetingParticipant; old?: MeetingParticipant; eventType: string }) => void) {
    return supabase
      .channel(`meeting_participants:${meetingId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meetingId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to meeting updates
  subscribeToMeeting(meetingId: string, callback: (payload: { new?: unknown; old?: unknown; eventType: string }) => void) {
    return supabase
      .channel(`meeting:${meetingId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${meetingId}`
        },
        callback
      )
      .subscribe();
  }
};