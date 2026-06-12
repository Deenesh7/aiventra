import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    badge: '',
  });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app/dashboard';

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(form.email, form.password, form.name || form.email.split('@')[0]);
        toast.success('Identity registered. Authenticating…');
      } else {
        await login(form.email, form.password);
      }
      toast.success('Authentication successful');
      navigate(from, { replace: true });
    } catch (err) {
      // Map Firebase error codes to friendly messages
      const code = err?.code || '';
      const friendly = {
        'auth/invalid-credential': 'Invalid email or password',
        'auth/invalid-email': 'Invalid email address',
        'auth/user-not-found': 'No account exists for this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Email is already registered — try signing in',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/network-request-failed': 'Network error — check your connection',
        'auth/too-many-requests': 'Too many attempts — please wait a moment',
      }[code];
      toast.error(friendly || err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-neon-cyan/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-neon-red/5 blur-[100px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="flex justify-center mb-8">
          <Logo size="lg" />
        </Link>

        <div className="panel p-8 corner-brackets relative">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="text-neon-cyan" size={18} />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-neon-cyan/80">
              Secure Access Portal
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold mb-1">
            {mode === 'login' ? 'Investigator Sign-In' : 'Register Identity'}
          </h1>
          <p className="text-xs text-slate-400 mb-6">
            {mode === 'login'
              ? 'Authenticate to access the forensic intelligence system.'
              : 'Provision a new authorized investigator account.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <>
                <Field
                  label="Full Name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="Det. A. Krishnan"
                  required
                />
                <Field
                  label="Badge / Identifier"
                  value={form.badge}
                  onChange={(v) => setForm({ ...form, badge: v })}
                  placeholder="AIV-2271"
                  required
                />
              </>
            )}
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="investigator@agency.gov"
              required
            />
            <Field
              label="Access Key"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="••••••••"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <span className="loading-dots"><span /><span /><span /></span>
              ) : (
                <>
                  {mode === 'login' ? 'Authenticate' : 'Register & Authenticate'}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-xs font-mono text-slate-400 hover:text-neon-cyan transition-colors"
            >
              {mode === 'login' ? '↳ Need credentials? Register an identity' : '↳ Already registered? Sign in'}
            </button>
          </div>

          <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-neon-amber/5 border border-neon-amber/20">
            <AlertCircle size={14} className="text-neon-amber flex-shrink-0 mt-0.5" />
            <p className="text-[10px] font-mono text-neon-amber/90 leading-relaxed">
              Authentication via Firebase Auth. Register any email + 6+ char password to provision your investigator identity.
            </p>
          </div>
        </div>

        <p className="text-center mt-6 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
          Authorized Personnel Only · Activity Audited
        </p>
      </motion.div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="input-field"
      />
    </div>
  );
}
