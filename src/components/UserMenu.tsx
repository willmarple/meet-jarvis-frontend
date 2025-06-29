import React, { useState } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { User, LogOut, Settings, ChevronDown, LogIn, UserPlus } from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, isSignedIn } = useUser();
  const { signOut, openSignIn, openSignUp, openUserProfile } = useClerk();
  const [isOpen, setIsOpen] = useState(false);

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openSignIn()}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>
        <button
          onClick={() => openSignUp()}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
      >
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <User className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm font-medium">
          {user?.firstName || user?.fullName || 'User'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
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
            </div>
            
            <div className="p-2">
              <button
                onClick={() => {
                  openUserProfile();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-left"
              >
                <Settings className="w-4 h-4" />
                Manage Account
              </button>
              
              <button
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};