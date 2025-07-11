import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';
import { UserRole } from '../types';
import Button from './ui/Button';
import Card from './ui/Card';
import Spinner from './ui/Spinner';

type View = 'login' | 'register' | 'forgot_password';

const AuthPage: React.FC = () => {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TEACHER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    switch (view) {
      case 'login': {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        // No reload needed, onAuthStateChange in App.tsx will handle it
        break;
      }
      case 'register': {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
          },
        });
        if (error) setError(error.message);
        else setMessage('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
        break;
      }
      case 'forgot_password': {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) setError(error.message);
        else setMessage('Email untuk reset password telah dikirim. Silakan cek inbox Anda.');
        break;
      }
    }
    setLoading(false);
  };
  
  const getTitle = () => {
    switch (view) {
        case 'login': return 'Login Akun';
        case 'register': return 'Daftar Akun Baru';
        case 'forgot_password': return 'Lupa Password';
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-darul-green-800">Madrasah Aliyah Darul Inayah</h1>
        <p className="text-xl text-gray-600 mt-2">Sistem Informasi Absensi Siswa</p>
        <p className="text-sm text-gray-500 mt-4 max-w-lg mx-auto">
            Jln. Cipeusing No. 120 Rt. 004 Rw. 004 Ds. Kertawangi Kec. Cisarua Kab. Bandung Barat - Jawa Barat 40551
        </p>
      </div>
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">{getTitle()}</h2>
        <form onSubmit={handleAuthAction}>
          {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>}
          {message && <p className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{message}</p>}
          
          {view === 'register' && (
             <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2" htmlFor="fullName">Nama Lengkap</label>
                <input
                    id="fullName"
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-darul-green-500"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                />
            </div>
          )}

          {view !== 'login' || <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2" htmlFor="email">Email</label>
            <input
              id="email"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-darul-green-500"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>}

          {view !== 'forgot_password' && <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2" htmlFor="password">Password</label>
            <input
              id="password"
              className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-darul-green-500"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {view === 'login' && (
                <button type="button" onClick={() => {setView('forgot_password'); setError(null)}} className="inline-block align-baseline font-bold text-sm text-darul-green-600 hover:text-darul-green-800">Lupa Password?</button>
            )}
          </div>}
          
          {view === 'register' && (
             <div className="mb-4">
                <label className="block text-gray-700 font-bold mb-2">Peran Anda</label>
                 <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-darul-green-500"
                >
                    <option value={UserRole.TEACHER}>Guru</option>
                    <option value={UserRole.PARENT}>Orang Tua</option>
                </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner size="sm" color="border-white"/> : (view === 'login' ? 'Login' : view === 'register' ? 'Daftar' : 'Kirim Email Reset')}
            </Button>
            <button
              type="button"
              onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(null); }}
              className="inline-block align-baseline font-bold text-sm text-darul-green-600 hover:text-darul-green-800"
            >
              {view === 'login' ? 'Buat akun baru' : 'Sudah punya akun? Login'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AuthPage;
