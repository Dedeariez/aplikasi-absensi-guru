
import React, { useState, useEffect } from 'react';
import { Profile, Student, AttendanceRecord, AttendanceStatus } from '../types';
import { getStudentsByParent, getAttendanceByStudentIds } from '../services/supabaseService';
import Card from './ui/Card';
import Spinner from './ui/Spinner';

const ParentView: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [children, setChildren] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const childData = await getStudentsByParent(profile.id);
      setChildren(childData);

      if (childData.length > 0) {
        const childIds = childData.map(c => c.id);
        const records = await getAttendanceByStudentIds(childIds);

        const attendanceByChild = new Map<string, AttendanceRecord[]>();
        records.forEach(record => {
          const studentRecords = attendanceByChild.get(record.student_id) || [];
          studentRecords.push(record);
          attendanceByChild.set(record.student_id, studentRecords);
        });
        setAttendanceData(attendanceByChild);
      }
      setLoading(false);
    };

    fetchData();
  }, [profile.id]);

  const calculateStats = (records: AttendanceRecord[] = []) => {
    const total = records.length;
    if (total === 0) return { present: 0, sick: 0, permission: 0, absent: 0, sleeping: 0, percentage: 100 };
    
    const presentCount = records.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const sickCount = records.filter(r => r.status === AttendanceStatus.SICK).length;
    const permissionCount = records.filter(r => r.status === AttendanceStatus.PERMISSION).length;
    const absentCount = records.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const sleepingCount = records.filter(r => r.status === AttendanceStatus.SLEEPING).length;
    
    const attendedTotal = presentCount + sickCount + permissionCount + absentCount + sleepingCount;
    const percentage = attendedTotal > 0 ? Math.round((presentCount / attendedTotal) * 100) : 100;

    return { present: presentCount, sick: sickCount, permission: permissionCount, absent: absentCount, sleeping: sleepingCount, percentage };
  };

  if (loading) {
    return (
      <Card className="flex justify-center items-center h-64">
        <Spinner />
      </Card>
    );
  }

  if (children.length === 0) {
    return (
        <Card>
            <h2 className="text-xl font-bold text-gray-800">Pemantauan Kehadiran</h2>
            <p className="mt-4 text-gray-600">Data anak Anda belum terhubung dengan akun ini. Silakan hubungi pihak sekolah untuk bantuan.</p>
        </Card>
    );
  }

  return (
    <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Pemantauan Kehadiran Anak</h2>
        <div className="space-y-6">
            {children.map(child => {
                const records = attendanceData.get(child.id) || [];
                const stats = calculateStats(records);
                const percentageColor = stats.percentage >= 90 ? 'text-green-600' : stats.percentage >= 75 ? 'text-yellow-600' : 'text-red-600';

                return (
                    <Card key={child.id}>
                        <div className="md:flex md:justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-darul-green-800">{child.full_name}</h3>
                                <p className="text-gray-600">Kelas {child.grade}{child.class_letter}</p>
                            </div>
                            <div className="mt-4 md:mt-0 text-right">
                                <p className="text-lg font-semibold text-gray-700">Tingkat Kehadiran</p>
                                <p className={`text-4xl font-bold ${percentageColor}`}>{stats.percentage}%</p>
                                {stats.percentage < 85 && <p className="text-sm text-red-600 mt-1">Perlu perhatian!</p>}
                            </div>
                        </div>

                        <div className="mt-6 border-t pt-4">
                            <h4 className="font-semibold mb-2">Riwayat Terbaru:</h4>
                            <ul className="space-y-2">
                                {records.slice(0, 7).map((rec, index) => (
                                    <li key={index} className="flex justify-between items-center text-sm p-2 rounded-md bg-gray-50">
                                        <span>{new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        <span className={`font-bold px-2 py-1 text-xs rounded-full ${
                                            rec.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-800' : 
                                            rec.status === AttendanceStatus.SICK ? 'bg-yellow-100 text-yellow-800' : 
                                            rec.status === AttendanceStatus.PERMISSION ? 'bg-blue-100 text-blue-800' : 
                                            rec.status === AttendanceStatus.SLEEPING ? 'bg-slate-100 text-slate-800' : 
                                            'bg-red-100 text-red-800'
                                        }`}>{rec.status}</span>
                                    </li>
                                ))}
                                {records.length === 0 && <p className="text-gray-500">Belum ada data absensi.</p>}
                            </ul>
                        </div>
                    </Card>
                )
            })}
        </div>
    </div>
  );
};

export default ParentView;