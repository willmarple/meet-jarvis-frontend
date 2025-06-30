import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { v4 as uuidv4 } from 'uuid';
import { AuthWrapper } from './components/AuthWrapper';
import { HomePage } from './components/HomePage';
import { MeetingRoom } from './components/MeetingRoom';
import { AppState, MeetingData, User } from './types/index';

function App() {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [appState, setAppState] = useState<AppState>('home');
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for room ID in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    
    if (roomFromUrl) {
      // If there's a room in URL, show join form with pre-filled room ID
      console.log('Room found in URL:', roomFromUrl);
    }
  }, []);

  const createRoom = async (userName: string) => {
    // Reset any previous errors
    setAuthError(null);
    
    try {
      // Generate room ID
      const roomId = uuidv4().substring(0, 8).toUpperCase();
      
      // For development, allow creating rooms without authentication using bypass token
      if (process.env.NODE_ENV === 'development' && !isSignedIn) {
        console.log('DEV MODE: Creating room with development bypass token');
        
        // Use the secure endpoint with development bypass token
        const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE}/api/secure/meetings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer dev-bypass-token',
          },
          body: JSON.stringify({ 
            id: roomId,
            name: `${userName}'s Meeting`
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create meeting');
        }
        
        const data = await response.json();
        
        setMeetingData({
          roomId: data.roomId || roomId,
          userName,
          userId: `guest-${uuidv4()}`,
        });
        
        // Update URL
        window.history.pushState({}, '', `?room=${data.roomId || roomId}`);
        setAppState('meeting');
        return;
      }
      
      // Check if user is authenticated before allowing meeting creation
      if (!isSignedIn || !user) {
        alert('Please sign in to create meetings. You can still join meetings with a meeting ID.');
        throw new Error('Authentication required');
      }

      // Get auth token from Clerk
      let token;
      try {
        token = await getToken();
        if (!token) {
          throw new Error('Failed to get authentication token');
        }
      } catch (tokenError) {
        console.error('Token error:', tokenError);
        throw new Error('Authentication failed - could not get token');
      }
      
      // Use secure API endpoint that requires authentication
      const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/api/secure/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          id: roomId,
          name: `${userName}'s Meeting`,
          host_id: user?.id || 'anonymous'
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create meeting');
      }
      
      const data = await response.json();
      
      setMeetingData({
        roomId: data.id,
        userName,
        userId: user?.id || 'anonymous',
      });
      
      // Update URL
      window.history.pushState({}, '', `?room=${data.id}`);
      setAppState('meeting');
    } catch (error) {
      console.error('Error creating room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create meeting room';
      setAuthError(errorMessage);
      throw error; // Re-throw so HomePage can handle it
    }
  };

  const joinRoom = async (roomId: string, userName: string) => {
    try {
      // Join meetings should always be public - no authentication required
      // This allows invited participants to join without signing up
      const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/api/rooms/${roomId}`);
      
      if (!response.ok) {
        alert('Meeting room not found. Please check the meeting ID.');
        throw new Error('Meeting room not found');
      }
      
      // Use Clerk user ID if signed in, otherwise generate UUID
      const userId = isSignedIn && user ? user.id : `guest-${uuidv4()}`;
      
      setMeetingData({
        roomId,
        userName,
        userId,
      });
      
      // Update URL
      window.history.pushState({}, '', `?room=${roomId}`);
      setAppState('meeting');
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join meeting room. Please try again.');
      throw error; // Re-throw so HomePage can handle it
    }
  };

  const leaveMeeting = () => {
    setAppState('home');
    setMeetingData(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <AuthWrapper allowAnonymous={true}>
      <div className="App">
        {appState === 'home' ? (
          <HomePage
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            user={user as User | null}
            isSignedIn={isSignedIn || false}
            authError={authError}
          />
        ) : (
          meetingData && (
            <MeetingRoom
              roomId={meetingData.roomId}
              userName={meetingData.userName}
              userId={meetingData.userId}
              onLeave={leaveMeeting}
              user={user as User | null}
              isSignedIn={isSignedIn || false}
            />
          )
        )}
      </div>
    </AuthWrapper>
  );
}

export default App;