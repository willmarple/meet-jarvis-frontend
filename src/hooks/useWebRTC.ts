import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Participant {
  id: string;
  name: string;
  socketId: string;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface UseWebRTCProps {
  roomId: string;
  userName: string;
  userId: string;
}

export const useWebRTC = ({ roomId, userName, userId }: UseWebRTCProps) => {
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const initializationRef = useRef(false);

  const createPeerConnection = useCallback((participantSocketId: string) => {
    const PC_CONFIG = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };
    
    const pc = new RTCPeerConnection(PC_CONFIG);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          target: participantSocketId,
          candidate: event.candidate
        });
      }
    };
    
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      console.log('Received remote stream from:', participantSocketId);
      setParticipants(prev => {
        const updated = new Map(prev);
        const participant = updated.get(participantSocketId);
        if (participant) {
          participant.stream = remoteStream;
          updated.set(participantSocketId, participant);
        }
        return updated;
      });
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantSocketId}:`, pc.connectionState);
    };
    
    return pc;
  }, []);

  const initializeMedia = useCallback(async () => {
    if (localStream) {
      console.log('Media already initialized, reusing existing stream');
      return localStream;
    }

    try {
      console.log('Requesting media access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('Stream obtained:', stream);
      setLocalStream(stream);
      
      // Set video element source immediately after getting stream
      setTimeout(() => {
        if (localVideoRef.current && stream) {
          console.log('Assigning stream to video element');
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(e => console.log('Video play failed:', e));
        }
      }, 100);
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, [localStream]);

  // Update video element when localStream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('Updating video element with stream');
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.log('Video play failed:', e));
    }
  }, [localStream]);

  const createOffer = useCallback(async (participantSocketId: string, stream: MediaStream) => {
    const pc = createPeerConnection(participantSocketId);
    peerConnectionsRef.current.set(participantSocketId, pc);
    
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    if (socketRef.current) {
      socketRef.current.emit('offer', {
        target: participantSocketId,
        offer
      });
    }
  }, [createPeerConnection]);

  const handleOffer = useCallback(async (data: { offer: RTCSessionDescriptionInit; sender: string }) => {
    const { offer, sender } = data;
    const pc = createPeerConnection(sender);
    peerConnectionsRef.current.set(sender, pc);
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    if (socketRef.current) {
      socketRef.current.emit('answer', {
        target: sender,
        answer
      });
    }
  }, [createPeerConnection, localStream]);

  const handleAnswer = useCallback(async (data: { answer: RTCSessionDescriptionInit; sender: string }) => {
    const { answer, sender } = data;
    const pc = peerConnectionsRef.current.get(sender);
    
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  }, []);

  const handleIceCandidate = useCallback(async (data: { candidate: RTCIceCandidate; sender: string }) => {
    const { candidate, sender } = data;
    const pc = peerConnectionsRef.current.get(sender);
    
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        if (socketRef.current) {
          socketRef.current.emit('toggle-audio', { audioEnabled: audioTrack.enabled });
        }
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        if (socketRef.current) {
          socketRef.current.emit('toggle-video', { videoEnabled: videoTrack.enabled });
        }
      }
    }
  }, [localStream]);

  const leaveRoom = useCallback(() => {
    console.log('Leaving room...');
    
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Clear video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setParticipants(new Map());
    setIsConnected(false);
    initializationRef.current = false;
  }, [localStream]);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) return;
    initializationRef.current = true;

    const connectToRoom = async () => {
      try {
        console.log('Connecting to room:', roomId);
        
        // Initialize media first
        const stream = await initializeMedia();
        
        // Initialize socket connection
        const socketUrl = import.meta.env.VITE_BACKEND_WS_URL || import.meta.env.VITE_BACKEND_URL || 'https://api.dope.vision';
        console.log('Connecting to socket server:', socketUrl);
        socketRef.current = io(socketUrl);
        
        socketRef.current.on('connect', () => {
          console.log('Connected to signaling server');
          setIsConnected(true);
          
          // Join room
          socketRef.current?.emit('join-room', {
            roomId,
            userName,
            userId
          });
        });
        
        socketRef.current.on('room-participants', (existingParticipants: Participant[]) => {
          console.log('Existing participants:', existingParticipants);
          const participantsMap = new Map<string, Participant>();
          
          existingParticipants.forEach(participant => {
            participantsMap.set(participant.socketId, {
              ...participant,
              audioEnabled: true,
              videoEnabled: true
            });
            
            // Create offer for existing participants
            createOffer(participant.socketId, stream);
          });
          
          setParticipants(participantsMap);
        });
        
        socketRef.current.on('user-joined', (participant: Participant) => {
          console.log('User joined:', participant);
          setParticipants(prev => {
            const updated = new Map(prev);
            updated.set(participant.socketId, {
              ...participant,
              audioEnabled: true,
              videoEnabled: true
            });
            return updated;
          });
        });
        
        socketRef.current.on('user-left', ({ participantId }) => {
          console.log('User left:', participantId);
          setParticipants(prev => {
            const updated = new Map(prev);
            const participant = Array.from(updated.values()).find(p => p.id === participantId);
            if (participant) {
              // Close peer connection
              const pc = peerConnectionsRef.current.get(participant.socketId);
              if (pc) {
                pc.close();
                peerConnectionsRef.current.delete(participant.socketId);
              }
              updated.delete(participant.socketId);
            }
            return updated;
          });
        });
        
        // WebRTC signaling events
        socketRef.current.on('offer', handleOffer);
        socketRef.current.on('answer', handleAnswer);
        socketRef.current.on('ice-candidate', handleIceCandidate);
        
        // Media control events
        socketRef.current.on('participant-audio-toggle', ({ participantId, audioEnabled }) => {
          setParticipants(prev => {
            const updated = new Map(prev);
            const participant = Array.from(updated.values()).find(p => p.id === participantId);
            if (participant) {
              participant.audioEnabled = audioEnabled;
              updated.set(participant.socketId, participant);
            }
            return updated;
          });
        });
        
        socketRef.current.on('participant-video-toggle', ({ participantId, videoEnabled }) => {
          setParticipants(prev => {
            const updated = new Map(prev);
            const participant = Array.from(updated.values()).find(p => p.id === participantId);
            if (participant) {
              participant.videoEnabled = videoEnabled;
              updated.set(participant.socketId, participant);
            }
            return updated;
          });
        });
        
      } catch (error) {
        console.error('Error connecting to room:', error);
        initializationRef.current = false; // Reset on error
      }
    };
    
    connectToRoom();
    
    return () => {
      console.log('Cleaning up WebRTC connection');
      leaveRoom();
    };
  }, [roomId, userName, userId, handleOffer, handleAnswer, handleIceCandidate, createOffer, initializeMedia, leaveRoom]);

  return {
    participants: Array.from(participants.values()),
    localStream,
    localVideoRef,
    isAudioEnabled,
    isVideoEnabled,
    isConnected,
    toggleAudio,
    toggleVideo,
    leaveRoom
  };
};