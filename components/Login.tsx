import React, { useState } from 'react';
import { LogIn, ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';
import { User, Role, Department } from '../types';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Mock authentication - in production, this would call an API
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // For demo purposes, allow login with any email if user is selected
    if (selectedUser) {
      onLogin(selectedUser);
      return;
    }

    // Try to find user by email
    const user = users.find(u => {
      // Generate email from user name for demo
      const userEmail = `${u.name.toLowerCase().replace(/\s+/g, '.')}@company.com`;
      return userEmail === email.toLowerCase();
    });

    if (user) {
      onLogin(user);
    } else {
      setError('Usuario no encontrado. Por favor, selecciona un usuario de la lista.');
    }
  };

  const handleQuickLogin = (user: User) => {
    setSelectedUser(user);
    setEmail(`${user.name.toLowerCase().replace(/\s+/g, '.')}@company.com`);
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0066ff]/20 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-[#0066ff]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            NFQ ESG Reporting Suite
          </h1>
          <p className="text-sm text-[#6a6a6a]">
            Inicia sesión para acceder a tu panel
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#aaaaaa] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6a6a6a]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedUser(null);
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:border-[#0066ff] focus:outline-none transition-colors"
                  placeholder="tu.email@company.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[#aaaaaa] mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6a6a6a]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:border-[#0066ff] focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-2.5 bg-[#0066ff] hover:bg-[#0052cc] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </button>
          </form>

          {/* Quick Login Section */}
          <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
            <p className="text-xs text-[#6a6a6a] mb-3 text-center">
              Acceso rápido (Demo)
            </p>
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleQuickLogin(user)}
                  className={`w-full p-3 rounded-lg border transition-colors text-left ${
                    selectedUser?.id === user.id
                      ? 'border-[#0066ff] bg-[#0066ff]/10'
                      : 'border-[#2a2a2a] hover:border-[#0066ff]/50 bg-[#0a0a0a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0066ff]/20 flex items-center justify-center text-xs font-medium text-[#0066ff]">
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-[#6a6a6a] truncate">
                        {user.role} • {user.department}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#6a6a6a] mt-6">
          © 2024 NFQ ESG Reporting Suite. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
