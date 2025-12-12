import React, { useState } from 'react';
import { Lock, User, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import {
  simpleHash,
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  sanitizeInput,
  isValidEmail,
  createSecureSession
} from '../lib/security';

interface LoginProps {
  onLogin: (user: { email: string; role: string; location?: string }) => void;
}

// Secure user credentials with hashed passwords
// In production, this should be stored in a secure backend database
const SECURE_USERS = [
  {
    email: 'staff@admin.com',
    passwordHash: simpleHash('Staffans7369'),
    role: 'admin',
    location: null
  },
  {
    email: 'manager@bigshop.com',
    passwordHash: simpleHash('MngrBig25'),
    role: 'manager',
    location: 'Big Shop'
  },
  {
    email: 'manager@smallshop.com',
    passwordHash: simpleHash('MngrSml25'),
    role: 'manager',
    location: 'Small Shop'
  },
  {
    email: 'manager@godown.com',
    passwordHash: simpleHash('MngrGdn25'),
    role: 'manager',
    location: 'Godown'
  }
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Sanitize inputs to prevent XSS
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Check rate limiting
    const rateLimitStatus = isRateLimited(sanitizedEmail);
    if (rateLimitStatus.limited) {
      setError(`Account temporarily locked. Please try again in ${rateLimitStatus.remainingTime} minutes.`);
      setLoading(false);
      return;
    }

    // Simulate network delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    // Secure password comparison using hash
    const passwordHash = simpleHash(password);
    const user = SECURE_USERS.find(u =>
      u.email === sanitizedEmail && u.passwordHash === passwordHash
    );

    if (user) {
      // Clear failed attempts on success
      clearFailedAttempts(sanitizedEmail);

      // Create secure session
      const session = createSecureSession({
        email: user.email,
        role: user.role,
        location: user.location
      });

      localStorage.setItem('staffManagementLogin', JSON.stringify(session));

      onLogin({
        email: user.email,
        role: user.role,
        location: user.location || undefined
      });
    } else {
      // Record failed attempt and get appropriate error message
      const result = recordFailedAttempt(sanitizedEmail);
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="max-w-md w-full relative z-10">
        {/* Premium Glass Card */}
        <div className="glass-card-static p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl rotate-6 opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Sparkles className="text-white" size={36} />
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gradient mb-2">
              Staff Management
            </h1>
            <p className="text-white/60">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-premium"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-premium pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} color="#ffffff" /> : <Eye size={18} color="#ffffff" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-premium py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Sign In
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>
          </form>

          {/* Footer hint */}
          <p className="text-center text-white/40 text-xs mt-6">
            Secure login for authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;