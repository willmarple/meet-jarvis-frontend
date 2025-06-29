import React, { useState } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { Video, Users, Plus, ArrowRight, Calendar, Clock, Shield, LogOut, User, LogIn, UserPlus } from 'lucide-react';

interface User {
  fullName?: string;
  firstName?: string;
  emailAddresses?: Array<{ emailAddress: string }>;
}

interface HomePageProps {
  onJoinRoom: (roomId: string, userName: string) => void;
  onCreateRoom: (userName: string) => void;
  user: User | null;
  isSignedIn: boolean;
  authError?: string | null;
}

export const HomePage: React.FC<HomePageProps> = ({ 
  onJoinRoom, 
  onCreateRoom, 
  user, 
  isSignedIn,
  authError 
}) => {
  const { signOut, openSignIn, openSignUp } = useClerk();
  const [userName, setUserName] = useState(
    isSignedIn && user ? (user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || '') : ''
  );
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim() && roomId.trim()) {
      setIsJoining(true);
      try {
        await onJoinRoom(roomId.trim().toUpperCase(), userName.trim());
      } finally {
        setIsJoining(false);
      }
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setIsJoining(true);
      try {
        await onCreateRoom(userName.trim());
      } finally {
        setIsJoining(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header with Auth Status */}
        <div className="flex justify-between items-start mb-16">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white">AI Meeting Platform</h1>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Connect with colleagues, friends, and AI assistants in high-quality video meetings. 
              Built for the future of collaborative communication.
            </p>
          </div>

          {/* Auth Status */}
          <div className="ml-8">
            {isSignedIn ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {user?.fullName || user?.firstName || 'User'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {user?.emailAddresses[0]?.emailAddress}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-3">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Guest Mode</span>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => openSignIn()}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <LogIn className="w-3 h-3" />
                    Sign In
                  </button>
                  <button
                    onClick={() => openSignUp()}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <UserPlus className="w-3 h-3" />
                    Sign Up
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Action Cards */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-16">
          {/* Join Meeting Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-semibold text-white">Join Meeting</h2>
            </div>
            
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 mb-2">
                  Meeting ID
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter meeting ID"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isJoining || !userName.trim() || !roomId.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Joining...
                  </>
                ) : (
                  <>
                    Join Meeting
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Create Meeting Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Plus className="w-6 h-6 text-green-400" />
              <h2 className="text-2xl font-semibold text-white">Create Meeting</h2>
            </div>
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label htmlFor="hostName" className="block text-sm font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="hostName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-sm text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Instant Meeting
                </p>
                <p className="text-xs text-gray-400">
                  Start your meeting immediately with a unique room ID
                </p>
                {isSignedIn && (
                  <p className="text-xs text-green-400 mt-1">
                    ✓ Your meeting will be saved to your account
                  </p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isJoining || !userName.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    Create Meeting
                    <Plus className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            
            {/* Display auth error if present */}
            {authError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{authError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-12">
            Built for Modern Communication
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">HD Video Quality</h4>
              <p className="text-gray-400">
                Crystal clear video and audio using WebRTC technology for the best meeting experience.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-green-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Instant Meetings</h4>
              <p className="text-gray-400">
                Start meetings instantly or join with a simple room ID. No downloads required.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Secure & Private</h4>
              <p className="text-gray-400">
                {isSignedIn 
                  ? 'Authenticated access with secure data isolation and privacy controls.'
                  : 'End-to-end encrypted communications with secure room management.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Authentication Benefits */}
        {!isSignedIn && (
          <div className="max-w-4xl mx-auto mt-16">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Unlock Premium Features
                </h3>
                <p className="text-gray-300 mb-6">
                  Sign up for free to access advanced AI features, meeting history, and secure knowledge management.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => openSignUp()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    Create Free Account
                  </button>
                  <button
                    onClick={() => openSignIn()}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};