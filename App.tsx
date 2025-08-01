
import React, { useState, useEffect } from 'react';
import Auth from './components/Auth.tsx';
import Dashboard from './components/Dashboard.tsx';
import ParentCheck from './components/ParentCheck.tsx';
import { User } from './types.ts';
import { supabase, getProfile } from './lib/supabaseClient.ts';
import { Loader2 } from 'lucide-react';

type ViewMode = 'teacher' | 'parent';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('teacher');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          setUser(profile);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error logging out:", error.message);
    }
    // The onAuthStateChange listener will handle setting user to null
    setViewMode('teacher'); // Reset to teacher login view on logout
    setLoading(false);
  };
  
  if (loading) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-gray-100">
              <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
          </div>
      );
  }

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  switch (viewMode) {
    case 'parent':
      return <ParentCheck onSwitchToTeacher={() => setViewMode('teacher')} />;
    case 'teacher':
    default:
      return <Auth onSwitchToParent={() => setViewMode('parent')} />;
  }
}

export default App;