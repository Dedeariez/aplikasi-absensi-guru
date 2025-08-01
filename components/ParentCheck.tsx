
import React, { useState } from 'react';
import { Student, AttendanceStatus } from '../types.ts';
import Card from './ui/Card.tsx';
import Input from './ui/Input.tsx';
import Button from './ui/Button.tsx';
import { ArrowLeft, Search, UserCircle, CheckCircle, XCircle, Clock, Thermometer, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.ts';

interface ParentCheckProps {
  onSwitchToTeacher: () => void;
}

type SearchType = 'nisn' | 'nameAndDob';

interface AttendanceResult {
    student_id: string;
    student_name: string;
    class_name: string;
    attendance_date: string;
    hour: number;
    status: AttendanceStatus;
}

const ParentCheck: React.FC<ParentCheckProps> = ({ onSwitchToTeacher }) => {
  const [searchType, setSearchType] = useState<SearchType>('nisn');
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [attendanceResult, setAttendanceResult] = useState<AttendanceResult[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAttendanceResult(null);
    setLoading(true);

    const params: { p_nisn?: string; p_name?: string; p_dob?: string; } = {};

    if (searchType === 'nisn') {
      if (!nisn) {
        setError('NISN tidak boleh kosong.');
        setLoading(false);
        return;
      }
      params.p_nisn = nisn.trim();
    } else {
      if (!name || !dob) {
        setError('Nama dan Tanggal Lahir harus diisi.');
        setLoading(false);
        return;
      }
      params.p_name = name.trim();
      params.p_dob = dob.trim();
    }

    const { data, error: rpcError } = await supabase.rpc('get_student_attendance_for_parent', params);

    if (rpcError) {
        setError(`Terjadi kesalahan: ${rpcError.message}`);
    } else if (data && data.length > 0) {
        setAttendanceResult(data as unknown as AttendanceResult[]);
    } else {
        setError('Data siswa tidak ditemukan. Periksa kembali data yang Anda masukkan.');
    }
    
    setLoading(false);
  };
  
  const getStatusInfo = (status: AttendanceStatus) => {
    switch(status) {
        case AttendanceStatus.Hadir: return { text: 'Hadir', color: 'text-green-600', Icon: CheckCircle };
        case AttendanceStatus.Sakit: return { text: 'Sakit', color: 'text-yellow-600', Icon: Thermometer };
        case AttendanceStatus.Izin: return { text: 'Izin', color: 'text-blue-600', Icon: FileText };
        case AttendanceStatus.Alpa: return { text: 'Alpa', color: 'text-red-600', Icon: XCircle };
        default: return { text: 'Belum Diabsen', color: 'text-gray-500', Icon: Clock };
    }
  };
  
  const resetSearch = () => {
    setAttendanceResult(null);
    setError('');
    setNisn('');
    setName('');
    setDob('');
    setLoading(false);
  }

  const foundStudentInfo = attendanceResult && attendanceResult.length > 0 ? attendanceResult[0] : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary-700">Cek Absensi Siswa</h1>
            <p className="text-gray-500 mt-1">Portal Wali Murid Madrasah Aliyah Darul Inayah</p>
        </div>
        
        <Card>
          {!foundStudentInfo ? (
             <form onSubmit={handleSearch}>
                <div className="mb-4">
                    <div className="flex border border-gray-200 rounded-lg p-1">
                        <button type="button" onClick={() => setSearchType('nisn')} className={`w-1/2 p-2 rounded-md text-sm font-medium transition-colors ${searchType === 'nisn' ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                            Cari dengan NISN
                        </button>
                        <button type="button" onClick={() => setSearchType('nameAndDob')} className={`w-1/2 p-2 rounded-md text-sm font-medium transition-colors ${searchType === 'nameAndDob' ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                            Cari dengan Nama & Tgl. Lahir
                        </button>
                    </div>
                </div>

                {searchType === 'nisn' ? (
                    <div>
                        <label htmlFor="nisn" className="block text-sm font-medium text-gray-700 mb-1">NISN Siswa</label>
                        <Input id="nisn" type="text" placeholder="Masukkan NISN" value={nisn} onChange={e => setNisn(e.target.value)} required disabled={loading}/>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap Siswa</label>
                            <Input id="name" type="text" placeholder="Masukkan nama lengkap" value={name} onChange={e => setName(e.target.value)} required disabled={loading}/>
                        </div>
                        <div>
                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                            <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} required disabled={loading}/>
                        </div>
                    </div>
                )}
                
                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                
                <Button type="submit" className="w-full mt-6" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Cari Siswa
                </Button>
            </form>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Hasil Pencarian</h2>
              <Card className="bg-primary-50 border border-primary-200 mb-4">
                  <div className="flex items-center">
                    <UserCircle className="w-12 h-12 text-primary-600" />
                    <div className="ml-4">
                      <p className="font-bold text-lg text-primary-800">{foundStudentInfo.student_name}</p>
                      <p className="text-sm text-primary-700">{`Kelas: ${foundStudentInfo.class_name}`}</p>
                    </div>
                  </div>
              </Card>

              <h3 className="font-semibold text-gray-700 mb-2">Absensi Hari Ini ({new Date(foundStudentInfo.attendance_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})</h3>
              <ul className="space-y-2">
                {attendanceResult?.sort((a,b) => a.hour - b.hour).map(record => {
                  const { text, color, Icon } = getStatusInfo(record.status);
                  return (
                    <li key={record.hour} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-600">Jam Pelajaran ke-{record.hour}</span>
                      <div className={`flex items-center font-semibold ${color}`}>
                        <Icon className="w-5 h-5 mr-2" />
                        <span>{text}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Button onClick={resetSearch} variant="secondary" className="w-full mt-6">
                  Cari Siswa Lain
              </Button>
            </div>
          )}

        </Card>
         <div className="text-center mt-4">
            <button onClick={onSwitchToTeacher} className="text-sm font-medium text-primary-600 hover:underline inline-flex items-center">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Kembali ke Portal Guru
            </button>
        </div>
      </div>
    </div>
  );
};

export default ParentCheck;