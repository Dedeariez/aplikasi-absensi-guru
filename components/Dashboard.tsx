
import React, { useState, useEffect } from 'react';
import { User, AuditLog as AuditLogType } from '../types.ts';
import Sidebar from './Sidebar.tsx';
import Header from './Header.tsx';
import HomeDashboard from './HomeDashboard.tsx';
import Students from './Students.tsx';
import Reports from './Reports.tsx';
import AuditLog from './AuditLog.tsx';
import Settings from './Settings.tsx';
import { supabase } from '../lib/supabaseClient.ts';
import { Loader2 } from 'lucide-react';

type View = 'dashboard' | 'students' | 'reports' | 'logs' | 'settings';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [auditLogs, setAuditLogs] = useState<AuditLogType[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (logsData) {
        setAuditLogs(logsData.map(log => ({ ...log, timestamp: new Date(log.timestamp) })));
      }
      
      // Fetch student count
      const { count, error: countError } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (count !== null) {
        setStudentCount(count);
      }
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const addAuditLog = async (action: string, details: string) => {
      const newLog = {
          user_id: user.id,
          user_name: user.name,
          action,
          details,
      };
      
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(newLog)
        .select()
        .single();
        
      if (data) {
        setAuditLogs(prevLogs => [{...data, timestamp: new Date(data.timestamp)}, ...prevLogs]);
      }
      if(error){
        console.error("Failed to add audit log:", error);
      }
  };


  const renderContent = () => {
    if (loading && currentView !== 'students') {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary-600"/></div>
    }
    switch (currentView) {
      case 'dashboard':
        return <HomeDashboard auditLogs={auditLogs} studentCount={studentCount} />;
      case 'students':
        return <Students currentUser={user} addAuditLog={addAuditLog} setStudentCount={setStudentCount} />;
      case 'reports':
        return <Reports />;
      case 'logs':
        return <AuditLog logs={auditLogs} />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return <HomeDashboard auditLogs={auditLogs} studentCount={studentCount} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;