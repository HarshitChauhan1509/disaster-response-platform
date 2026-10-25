import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldAlert, LogIn } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { api } from '../lib/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'coordinator@santrionn.com',
      password: 'Password123!',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/auth/login', data);
      if (res.data.success && res.data.data) {
        login(res.data.data.token, res.data.data.user);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'Login failed. Please check your credentials and try again.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (email: string) => {
    setValue('email', email);
    setValue('password', 'Password123!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 shadow-lg shadow-emerald-950/50">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase">Santrionn Technologies</h1>
          <p className="text-xs text-slate-400 tracking-wide font-mono">
            DISASTER RESPONSE COORDINATION PLATFORM
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-sm font-semibold text-slate-200">Incident Commander & Responder Sign In</h2>
            <p className="text-xs text-slate-400 mt-0.5">Authenticate to access operational dispatch</p>
          </div>

          {errorMsg && <Alert type="error" message={errorMsg} />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="operator@santrionn.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <LogIn className="w-4 h-4 mr-1.5" />
              Sign In to Command Center
            </Button>
          </form>

          {/* Reviewer Quick Access Demo Accounts */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Quick-Fill Reviewer Demo Accounts:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('coordinator@santrionn.com')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-left"
              >
                <div className="font-medium">Coordinator</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">coordinator@santrionn.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin@santrionn.com')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-purple-500/50 hover:text-purple-400 transition-colors text-left"
              >
                <div className="font-medium">Admin</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">admin@santrionn.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('responder.medical@santrionn.com')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-blue-500/50 hover:text-blue-400 transition-colors text-left"
              >
                <div className="font-medium">Medic Responder</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">responder.medical@...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('responder.fire@santrionn.com')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-orange-500/50 hover:text-orange-400 transition-colors text-left"
              >
                <div className="font-medium">Fire Responder</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">responder.fire@...</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center font-mono">
              Default password for all accounts: <span className="text-slate-400">Password123!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
