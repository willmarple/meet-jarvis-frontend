import React from 'react';
import { useUser, SignIn, SignUp } from '@clerk/clerk-react';
import { Loader2, Users, UserPlus, LogIn, ArrowLeft } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowAnonymous?: boolean;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ 
  children, 
  requireAuth = false,
  allowAnonymous = true 
}) => {
  const { isSignedIn, isLoaded } = useUser();
  const [authMode, setAuthMode] = React.useState<'signin' | 'signup' | 'anonymous' | null>(null);

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  // If user is signed in, show the app
  if (isSignedIn) {
    return <>{children}</>;
  }

  // If auth is required and user is not signed in, show auth options
  if (requireAuth && !isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Authentication Required</h1>
            <p className="text-xl text-gray-300">
              Please sign in to access this feature
            </p>
          </div>

          {/* Auth Mode Selection */}
          {!authMode && (
            <div className="max-w-md mx-auto space-y-4">
              <button
                onClick={() => setAuthMode('signin')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </button>
              
              <button
                onClick={() => setAuthMode('signup')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Create Account
              </button>

              {allowAnonymous && (
                <button
                  onClick={() => setAuthMode('anonymous')}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <Users className="w-5 h-5" />
                  Continue as Guest
                </button>
              )}
            </div>
          )}

          {/* Auth Components */}
          <div className="max-w-md mx-auto">
            {authMode === 'signin' && (
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <button
                    onClick={() => setAuthMode(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to options
                  </button>
                </div>
                <div className="p-6">
                  <SignIn 
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "shadow-none border-0 p-0",
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {authMode === 'signup' && (
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <button
                    onClick={() => setAuthMode(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to options
                  </button>
                </div>
                <div className="p-6">
                  <SignUp 
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "shadow-none border-0 p-0",
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {authMode === 'anonymous' && allowAnonymous && (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">Guest Access</h3>
                <p className="text-gray-300 mb-4">
                  You can join meetings as a guest, but some features may be limited.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setAuthMode(null)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Continue as Guest
                  </button>
                  <button
                    onClick={() => setAuthMode(null)}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Back to Options
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If auth is not required or anonymous is allowed, show the app
  return <>{children}</>;
};