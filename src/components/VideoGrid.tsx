import React from 'react';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  socketId: string;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface VideoGridProps {
  participants: Participant[];
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  currentUserName: string;
  isLocalAudioEnabled: boolean;
  isLocalVideoEnabled: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  localStream,
  localVideoRef,
  currentUserName,
  isLocalAudioEnabled,
  isLocalVideoEnabled
}) => {
  const totalParticipants = participants.length + 1; // +1 for local user
  
  const getGridClass = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-3';
    return 'grid-cols-3';
  };

  const getVideoClass = () => {
    if (totalParticipants === 1) return 'aspect-video';
    if (totalParticipants === 2) return 'aspect-video';
    return 'aspect-video';
  };

  return (
    <div className={`grid gap-4 h-full p-4 ${getGridClass()}`}>
      {/* Local Video */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden group">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${getVideoClass()}`}
          style={{ transform: 'scaleX(-1)' }} // Mirror local video
        />
        
        {(!isLocalVideoEnabled || !localStream) && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-300" />
            </div>
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <span className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium">
            {currentUserName} (You)
          </span>
          <div className="flex gap-2">
            <div className={`p-2 rounded-full ${isLocalAudioEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isLocalAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </div>
            <div className={`p-2 rounded-full ${isLocalVideoEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isLocalVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </div>

      {/* Remote Videos */}
      {participants.map((participant) => (
        <RemoteVideo
          key={participant.socketId}
          participant={participant}
          videoClass={getVideoClass()}
        />
      ))}
    </div>
  );
};

interface RemoteVideoProps {
  participant: Participant;
  videoClass: string;
}

const RemoteVideo: React.FC<RemoteVideoProps> = ({ participant, videoClass }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && participant.stream) {
      console.log('Setting remote stream for participant:', participant.name);
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(e => console.log('Remote video play failed:', e));
    }
  }, [participant.stream, participant.name]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden group">
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${videoClass}`}
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <User className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">Connecting...</p>
          </div>
        </div>
      )}
      
      {!participant.videoEnabled && participant.stream && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-300" />
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <span className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium">
          {participant.name}
        </span>
        <div className="flex gap-2">
          <div className={`p-2 rounded-full ${participant.audioEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {participant.audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </div>
          <div className={`p-2 rounded-full ${participant.videoEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {participant.videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </div>
        </div>
      </div>
    </div>
  );
};