import React, { useState, useEffect } from 'react';
import { Profile, Student } from '../types';
import { supabase, addAuditLog } from '../services/supabaseService';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

const AdminView: React.FC<{ profile: Profile }> = ({ profile: adminProfile }) => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('*')
                .order('email');
            if (usersError) throw usersError;

            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .order('full_name');
            if (studentsError) throw studentsError;

            setUsers(usersData || []);
            setStudents(studentsData || []);
        } catch (err: any) {
            setError('Gagal memuat data admin: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (userEmail === 'ayahnieda@gmail.com') {
            alert('Tidak dapat menghapus akun Super Admin.');
            return;
        }
        if (window.confirm(`Anda yakin ingin menghapus pengguna dengan email ${userEmail}? Tindakan ini akan menghapus profil mereka dari database.`)) {
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) {
                alert('Gagal menghapus pengguna: ' + error.message);
            } else {
                await addAuditLog(`Super admin menghapus pengguna: ${userEmail}`, adminProfile.email);
                alert('Pengguna berhasil dihapus.');
                fetchData();
            }
        }
    };

    const handleDeleteStudent = async (studentId: string, studentName: string) => {
        if (window.confirm(`Anda yakin ingin menghapus siswa bernama ${studentName}? Tindakan ini akan menghapus semua data absensinya.`)) {
            const { error } = await supabase.from('students').delete().eq('id', studentId);
            if (error) {
                alert('Gagal menghapus siswa: ' + error.message);
            } else {
                await addAuditLog(`Super admin menghapus siswa: ${studentName}`, adminProfile.email);
                alert('Siswa berhasil dihapus.');
                fetchData();
            }
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
    if (error) return <Card><p className="text-red-600 bg-red-100 p-3 rounded-lg">{error}</p></Card>;

    return (
        <div className="space-y-8">
            <Card>
                <h3 className="text-xl font-bold mb-4">Manajemen Pengguna</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peran</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.full_name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <Button 
                                            variant="danger" 
                                            size="sm"
                                            onClick={() => handleDeleteUser(user.id, user.email)}
                                            disabled={user.email === 'ayahnieda@gmail.com'}
                                            title={user.email === 'ayahnieda@gmail.com' ? 'Tidak dapat menghapus diri sendiri' : `Hapus ${user.full_name}`}
                                        >
                                            Hapus
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card>
                <h3 className="text-xl font-bold mb-4">Manajemen Data Siswa</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelas</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {students.map(student => (
                                <tr key={student.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.full_name}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{student.grade}{student.class_letter}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <Button 
                                            variant="danger" 
                                            size="sm"
                                            onClick={() => handleDeleteStudent(student.id, student.full_name)}
                                            title={`Hapus ${student.full_name}`}
                                        >
                                            Hapus
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AdminView;
