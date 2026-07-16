import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/common/Toast';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/common/Button';
import { signupSchema, type SignupFormValues } from '@/validators/auth.validators';

export default function Register() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await signup(data.email, data.password);
      success('Account created! Welcome aboard.');
      navigate('/app/dashboard');
    } catch (err: unknown) {
      const e = err as { message?: string };
      error(e.message || 'Sign up failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0d14] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-100">AutoDocs AI</span>
        </div>

        <div className="card p-7">
          <h1 className="text-lg font-semibold text-slate-100 mb-1">Create account</h1>
          <p className="text-sm text-slate-500 mb-6">Start generating docs automatically</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <PasswordInput
              label="Password"
              placeholder="Min 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordInput
              label="Confirm Password"
              id="confirmPassword"
              placeholder="Repeat password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
