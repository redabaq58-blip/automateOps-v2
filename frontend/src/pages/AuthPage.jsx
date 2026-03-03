import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = isLogin
        ? await authAPI.login({ email, password })
        : await authAPI.register({ email, password, name });
      login(res.data.token, res.data.user);
      toast.success(isLogin ? 'Welcome back' : 'Account created');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20" data-testid="auth-page">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
          <Database className="w-6 h-6 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{isLogin ? 'Sign in' : 'Create account'}</h1>
        <p className="text-sm text-zinc-500 mt-1">Access your saved occupations and API keys</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 text-sm" data-testid="auth-name-input" />
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 text-sm" data-testid="auth-email-input" required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Password</Label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" className="bg-zinc-900/50 border-zinc-800 focus:border-indigo-500 text-sm" data-testid="auth-password-input" required />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm" data-testid="auth-submit-btn">
          {loading ? 'Loading...' : isLogin ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-xs text-zinc-500 mt-6">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-400 hover:text-indigo-300" data-testid="auth-toggle-btn">
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
