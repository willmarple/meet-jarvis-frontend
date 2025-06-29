import React from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, Monitor, Settings, Users } from 'lucide-react';

interface MeetingControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveRoom: () => void;
  participantCount: number;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveRoom,
  participantCount
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl px-6 py-4 border border-gray-700/50">
        <div className="flex items-center gap-4">
          {/* Audio Control */}
          <button
            onClick={onToggleAudio}
            className={`p-4 rounded-xl transition-all duration-200 hover:scale-105 ${
              isAudioEnabled 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Video Control */}
          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-xl transition-all duration-200 hover:scale-105 ${
              isVideoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            className="p-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200 hover:scale-105"
            title="Share screen"
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Participants */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 rounded-xl">
            <Users className="w-5 h-5 text-gray-300" />
            <span className="text-white font-medium">{participantCount}</span>
          </div>

          {/* Settings */}
          <button
            className="p-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200 hover:scale-105"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Leave Room */}
          <button
            onClick={onLeaveRoom}
            className="p-4 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all duration-200 hover:scale-105"
            title="Leave meeting"
          >
            <Phone className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};