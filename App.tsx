import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { supabase, getProfile } from './services/supabaseService';
import { Profile } from './types';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import Spinner from './components/ui/Spinner';
import Button from './components/ui/Button';

const App: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const userProfile = await getProfile(session.user);
        setProfile(userProfile);
      }
      setLoading(false);
    };
    checkUser();

    // This listener handles automatic UI updates on auth state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
         getProfile(session.user).then(setProfile);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
      setLoading(true);
      await supabase.auth.signOut();
      // setProfile(null) is handled by onAuthStateChange
      // No need to reload, navigation is handled by the Routes component
      setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <HashRouter>
        {profile && (
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                         <div className="flex-shrink-0 font-bold text-darul-green-700">
                             Sistem Absensi Darul Inayah
                         </div>
                         <div className="flex items-center space-x-4">
                             <span className="text-gray-700 text-sm">Hi, {profile.full_name}</span>
                             <Button onClick={handleLogout} variant="secondary" size="sm">Logout</Button>
                         </div>
                    </div>
                </nav>
            </header>
        )}
      <main>
        <Routes>
          <Route path="/login" element={!profile ? <AuthPage /> : <Navigate to="/" />} />
          <Route path="/" element={profile ? <Dashboard profile={profile} /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <footer className="text-center p-6 bg-gray-50">
          <p className="text-sm font-semibold text-gray-800">Madrasah Aliyah Darul Inayah</p>
          <p className="text-xs text-gray-500 mt-1">
              Jln. Cipeusing No. 120 Rt. 004 Rw. 004 Ds. Kertawangi Kec. Cisarua Kab. Bandung Barat - Jawa Barat 40551
          </p>
      </footer>
    </HashRouter>
  );
};

export default App;