import React, { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: { email: string; role: string; location?: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const users = [
    { email: 'staff@admin.com', password: 'Staffans7369', role: 'admin', location: null },
    { email: 'manager@bigshop.com', password: 'MngrBig25', role: 'manager', location: 'Big Shop' },
    { email: 'manager@smallshop.com', password: 'MngrSml25', role: 'manager', location: 'Small Shop' },
    { email: 'manager@godown.com', password: 'MngrGdn25', role: 'manager', location: 'Godown' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      // Store login session
      const loginData = {
        user: {
          email: user.email,
          role: user.role,
          location: user.location
        },
        timestamp: Date.now(),
        expiresIn: 30 * 24 * 60 * 60 * 1000 // 30 days
      };
      localStorage.setItem('staffManagementLogin', JSON.stringify(loginData));
      
      onLogin({
        email: user.email,
        role: user.role,
        location: user.location
      });
    } else {
      setError('Invalid email or password');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-white" size={24} />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Staff Management System</h1>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;