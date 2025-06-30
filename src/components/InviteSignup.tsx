import React, { useState, useEffect } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { Loader2, CheckCircle, XCircle, ArrowLeft, Mail } from 'lucide-react';

interface InviteTokenData {
  email: string | null;
  role: string;
  expires_at: string;
  metadata?: {
    purpose?: string;
  };
}

interface InviteSignupProps {
  inviteToken: string;
  onSuccess: () => void;
  onBack: () => void;
}

export const InviteSignup: React.FC<InviteSignupProps> = ({
  inviteToken,
  onSuccess,
  onBack
}) => {
  const { signUp, setActive } = useSignUp();
  const [tokenData, setTokenData] = useState<InviteTokenData | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: ''
  });

  // Validate invite token on component mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const API_BASE = import.meta.env.VITE_BACKEND_URL || 'https://api.dope.vision';
        const response = await fetch(`${API_BASE}/api/public/invite-tokens/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: inviteToken }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Invalid invite token');
        }

        const data = await response.json();
        if (data.valid) {
          setTokenData(data);
          // Pre-fill email if provided by token
          if (data.email) {
            setFormData(prev => ({ ...prev, email: data.email }));
          }
        } else {
          throw new Error('Invalid invite token');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setValidationError(error instanceof Error ? error.message : 'Token validation failed');
      } finally {
        setIsValidating(false);
      }
    };

    if (inviteToken) {
      validateToken();
    } else {
      setValidationError('No invite token provided');
      setIsValidating(false);
    }
  }, [inviteToken]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenData || !signUp) return;

    setIsSigningUp(true);
    setSignupError(null);

    try {
      // Use email from form data (either pre-filled from token or entered by user)
      const emailToUse = formData.email || tokenData.email;
      if (!emailToUse) {
        throw new Error('Email is required');
      }

      // Create account with Clerk (only emailAddress and password are supported)
      const result = await signUp.create({
        emailAddress: emailToUse,
        password: formData.password,
      });

      // Complete signup process
      if (result.status === 'complete') {
        // Set the session as active
        await setActive({ session: result.createdSessionId });

        // TODO: Update user profile with firstName and lastName after redirect
        // This can be done in the main app after the user is authenticated

        // Consume the invite token
        const API_BASE = import.meta.env.VITE_BACKEND_URL || 'https://api.dope.vision';
        await fetch(`${API_BASE}/api/public/invite-tokens/consume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token: inviteToken,
            user_id: result.createdUserId 
          }),
        });

        console.log('Signup successful and token consumed');
        onSuccess();
      } else if (result.status === 'missing_requirements') {
        // Handle email verification requirement
        console.log('Email verification required');
        
        // Prepare email verification
        await result.prepareEmailAddressVerification({ strategy: 'email_code' });
        
        // Set verification state to show email verification UI
        setVerificationSent(true);
        setUserEmail(emailToUse);
        setSignupError(null); // Clear any errors
        
      } else {
        // Handle other verification requirements
        console.log('Signup requires verification:', result.status);
        throw new Error(`Signup requires additional verification: ${result.status}`);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setSignupError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp || !verificationCode.trim()) return;

    setIsVerifying(true);
    setSignupError(null);

    try {
      // Attempt email verification with the code
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });

      if (result.status === 'complete') {
        // Set the session as active
        await setActive({ session: result.createdSessionId });

        // Consume the invite token
        const API_BASE = import.meta.env.VITE_BACKEND_URL || 'https://api.dope.vision';
        await fetch(`${API_BASE}/api/public/invite-tokens/consume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token: inviteToken,
            user_id: result.createdUserId 
          }),
        });

        console.log('Email verification successful and token consumed');
        onSuccess();
      } else {
        throw new Error('Verification failed - unexpected status: ' + result.status);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setSignupError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Validating invite token...</p>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Invite Token</h2>
          <p className="text-gray-300 mb-6">{validationError}</p>
          <button
            onClick={onBack}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <Mail className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-4">Enter Verification Code</h1>
            <p className="text-xl text-gray-300">
              We've sent a verification code to your email address
            </p>
          </div>

          {/* Verification Code Form */}
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg p-8">
              <div className="mb-6">
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </button>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost Done!</h2>
                <p className="text-gray-600">Enter the 6-digit code sent to <strong>{userEmail}</strong></p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Code *
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-wider"
                  />
                  <p className="text-sm text-gray-500 mt-1">Check your email for the verification code</p>
                </div>

                {/* Error Display */}
                {signupError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{signupError}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isVerifying || verificationCode.trim().length !== 6}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Complete Setup'
                  )}
                </button>
              </form>

              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Email sent to:</strong> {userEmail}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Role:</strong> {tokenData?.role}
                </p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Didn't receive the code? Check your spam folder or try signing up again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-4">Judge Invitation</h1>
          <p className="text-xl text-gray-300">
            You've been invited as a {tokenData?.role} for the hackathon platform
          </p>
        </div>

        {/* Signup Form */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg p-8">
            <div className="mb-6">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Email (read-only if from token, editable if not) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="emailAddress"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!!tokenData?.email}
                  placeholder={!tokenData?.email ? "Enter your email address" : ""}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
                    tokenData?.email 
                      ? 'bg-gray-50 text-gray-700' 
                      : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {!tokenData?.email && (
                  <p className="text-sm text-gray-500 mt-1">Enter the email address you'd like to use for your account</p>
                )}
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              {/* Error Display */}
              {signupError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{signupError}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                {isSigningUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Join Platform'
                )}
              </button>
            </form>

            {/* Token Info */}
            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Role:</strong> {tokenData?.role}
              </p>
              {tokenData?.metadata?.purpose && (
                <p className="text-sm text-gray-600">
                  <strong>Purpose:</strong> {tokenData.metadata.purpose}
                </p>
              )}
              <p className="text-sm text-gray-600">
                <strong>Expires:</strong> {tokenData?.expires_at ? new Date(tokenData.expires_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};