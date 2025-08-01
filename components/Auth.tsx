
import React, { useState } from 'react';
import Button from './ui/Button.tsx';
import Input from './ui/Input.tsx';
import { supabase } from '../lib/supabaseClient.ts';
import { Loader2 } from 'lucide-react';

interface AuthProps {
  onSwitchToParent: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSwitchToParent }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isForgotEmail, setIsForgotEmail] = useState(false);

  const clearMessages = () => {
    setError('');
    setMessage('');
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        setError('Email atau password salah.');
    } 
    // No need to call onLogin, the App component's listener will handle it.
    setLoading(false);
  };
  
  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      clearMessages();

      if (!name || !email || !password) {
        setError('Semua field harus diisi.');
        return;
      }
      setLoading(true);

      const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
              data: {
                  name: name,
              }
          }
      });
      
      if (error) {
          setError(error.message);
      } else {
          setMessage('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
          setIsLoginView(true); // Switch to login view after successful signup
      }
      setLoading(false);
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if(!email) {
        setError("Silakan masukkan email Anda untuk pemulihan.")
        return;
    }
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Redirect URL after password reset
    });

    if (error) {
        setError(error.message);
    } else {
        setMessage(`Email pemulihan telah dikirim ke ${email}.`);
        setIsForgotPassword(false);
    }
    setLoading(false);
  }
  
  const switchView = (view: 'login' | 'signup' | 'forgotPassword' | 'forgotEmail') => {
      clearMessages();
      setIsLoginView(view === 'login');
      setIsForgotPassword(view === 'forgotPassword');
      setIsForgotEmail(view === 'forgotEmail');
  }

  const renderLogin = () => (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Selamat Datang</h2>
      <p className="text-gray-600 mb-6">Login untuk melanjutkan</p>
      <form onSubmit={handleLogin} className="space-y-4">
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}/>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-500 text-sm">{message}</p>}
        <div className="flex justify-between items-center text-sm">
            <button onClick={() => switchView('forgotEmail')} type="button" className="font-medium text-primary-600 hover:underline">
                Lupa Email?
            </button>
            <button onClick={() => switchView('forgotPassword')} type="button" className="font-medium text-primary-600 hover:underline">
                Lupa Password?
            </button>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Login
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Belum punya akun?{' '}
        <button onClick={() => switchView('signup')} className="font-medium text-primary-600 hover:text-primary-500">
          Daftar di sini
        </button>
      </p>
    </>
  )

  const renderSignup = () => (
    <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Buat Akun Baru</h2>
      <p className="text-gray-600 mb-6">Isi data diri Anda</p>
      <form onSubmit={handleSignup} className="space-y-4">
        <Input placeholder="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}/>
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}/>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-500 text-sm">{message}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Daftar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Sudah punya akun?{' '}
        <button onClick={() => switchView('login')} className="font-medium text-primary-600 hover:text-primary-500">
          Login di sini
        </button>
      </p>
    </>
  )
  
  const renderForgotPassword = () => (
     <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Lupa Password</h2>
      <p className="text-gray-600 mb-6">Masukkan email Anda untuk menerima link pemulihan.</p>
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}/>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-500 text-sm">{message}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Kirim Link Pemulihan
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Ingat passwordnya?{' '}
        <button onClick={() => switchView('login')} className="font-medium text-primary-600 hover:text-primary-500">
          Kembali ke Login
        </button>
      </p>
    </>
  )
  
  const renderForgotEmail = () => (
     <>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Lupa Email</h2>
      <p className="text-gray-600 mb-6 text-center">
        Untuk bantuan pemulihan akun email Anda, silakan hubungi pihak administrasi Madrasah Aliyah Darul Inayah.
      </p>
      <Button onClick={() => switchView('login')} className="w-full">
        Kembali ke Login
      </Button>
    </>
  )


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-xl">
          <div className="text-center">
             <h1 className="text-3xl font-bold text-primary-700">Absensi Darul Inayah</h1>
             <p className="text-gray-500 mt-2">Portal Guru</p>
          </div>
          <div className="relative">
            {isForgotEmail ? renderForgotEmail() : isForgotPassword ? renderForgotPassword() : isLoginView ? renderLogin() : renderSignup()}
          </div>

          <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-xs text-gray-400">ATAU</span>
              <div className="flex-grow border-t border-gray-200"></div>
          </div>
          
          <div className="text-center">
              <button onClick={onSwitchToParent} className="font-medium text-primary-600 hover:underline">
                  Cek Absensi (Untuk Orang Tua)
              </button>
          </div>

      </div>
    </div>
  );
};

export default Auth;