import React, { useState } from 'react';
import { LogIn, ShieldCheck, Mail, Lock, AlertCircle, LayoutDashboard, Target, Database, FileBarChart } from 'lucide-react';
import { User } from '../types';
import { isSupabaseClientAvailable } from '../services/supabaseClient';
import { signInWithEmailPassword } from '../services/authService';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

/** Demo local: solo desarrollo o si se fuerza explícitamente (nunca en build de producción sin flag). */
function isDemoLoginAllowed(): boolean {
  if (import.meta.env.DEV) return true;
  return import.meta.env.VITE_ALLOW_DEMO_LOGIN === 'true';
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supabaseOk = isSupabaseClientAvailable();
  const demoAllowed = isDemoLoginAllowed();
  const showDemoUi = demoAllowed && !supabaseOk;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedUser) {
      onLogin(selectedUser);
      return;
    }

    if (supabaseOk) {
      setSubmitting(true);
      try {
        const { user, error: authErr } = await signInWithEmailPassword(email, password);
        if (user) {
          onLogin(user);
          return;
        }
        setError(authErr?.message ?? 'No se pudo iniciar sesión.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!showDemoUi) {
      setError(
        'Supabase no está configurado. En producción se requiere VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
      );
      return;
    }

    const user = users.find(u => {
      const userEmail = `${u.name.toLowerCase().replace(/\s+/g, '.')}@company.com`;
      return userEmail === email.toLowerCase();
    });

    if (user) {
      onLogin(user);
    } else {
      setError('Usuario no encontrado. Usa acceso rápido (demo) o configura Supabase.');
    }
  };

  const handleQuickLogin = (user: User) => {
    setSelectedUser(user);
    setEmail(`${user.name.toLowerCase().replace(/\s+/g, '.')}@company.com`);
    onLogin(user);
  };

  const features = [
    { icon: LayoutDashboard, label: 'Dashboard', desc: 'Overview indicadores reportados y pendientes' },
    { icon: Target, label: 'Materialidad', desc: 'Evaluación de topics ESRS y profundidad' },
    { icon: Database, label: 'Data', desc: 'Indicadores, CSV, cuestionarios, conexiones ERP' },
    { icon: FileBarChart, label: 'Reporting', desc: 'Narrativa, índice e informe final' }
  ];

  if (import.meta.env.PROD && !supabaseOk) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-amber-500/40 bg-amber-950/30 p-6 text-center">
          <ShieldCheck className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-white mb-2">Configuración requerida</h1>
          <p className="text-sm text-[#a3a3a3] text-left">
            El despliegue en producción necesita Supabase (variables{' '}
            <code className="text-xs bg-black/40 px-1 rounded">VITE_SUPABASE_URL</code> y{' '}
            <code className="text-xs bg-black/40 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>
            ). Cópialas desde tu proyecto Supabase → <em className="text-[#c4c4c4]">Settings → API</em> (Project
            URL y anon public). En{' '}
            <strong className="text-[#d4d4d4]">Vercel → tu proyecto → Settings → Environment Variables</strong>{' '}
            añádelas para <em>Production</em> y vuelve a desplegar. El modo demo solo aplica en desarrollo local.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-lg flex flex-col lg:flex-row lg:gap-8 lg:max-w-4xl lg:items-center">
        <div className="hidden lg:block flex-1 mb-8 lg:mb-0">
          <h2 className="text-lg font-semibold text-white mb-4">Funcionalidades</h2>
          <div className="space-y-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                <div className="p-1.5 bg-[#0066ff]/20 rounded">
                  <Icon className="w-4 h-4 text-[#0066ff]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-[#6a6a6a]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md lg:flex-shrink-0">
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
          <div className="mt-4 lg:hidden flex flex-wrap justify-center gap-2">
            {features.map(({ label }) => (
              <span key={label} className="px-2 py-0.5 rounded bg-[#1a1a1a] text-xs text-[#6a6a6a] border border-[#2a2a2a]">
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
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
                  required={supabaseOk}
                  disabled={!supabaseOk && showDemoUi}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#0066ff] hover:bg-[#0052cc] disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? 'Entrando…' : 'Iniciar Sesión'}
            </button>
          </form>

          {showDemoUi && (
          <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
            <p className="text-xs text-[#6a6a6a] mb-3 text-center">
              Acceso rápido (solo entorno local / demo)
            </p>
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
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
          )}
        </div>

        <p className="text-center text-xs text-[#6a6a6a] mt-6">
          © 2024 NFQ ESG Reporting Suite. Todos los derechos reservados.
        </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
