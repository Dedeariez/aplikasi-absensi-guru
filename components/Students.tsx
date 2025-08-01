import React, { useState, useEffect } from 'react';
import { Student, AttendanceStatus, User } from '../types.ts';
import Button from './ui/Button.tsx';
import { Upload, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import ImportModal from './ImportModal.tsx';
import StudentFormModal from './StudentFormModal.tsx';
import Card from './ui/Card.tsx';
import { supabase } from '../lib/supabaseClient.ts';
import { format } from 'date-fns';

const JAM_PELAJARAN = [1, 2, 3, 4, 5, 6, 7, 8];

interface StudentsProps {
    currentUser: User;
    addAuditLog: (action: string, details: string) => Promise<void>;
    setStudentCount: React.Dispatch<React.SetStateAction<number>>;
}

const Students: React.FC<StudentsProps> = ({ currentUser, addAuditLog, setStudentCount }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, Record<number, AttendanceStatus>>>({});
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isStudentFormModalOpen, setStudentFormModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            const today = format(new Date(), 'yyyy-MM-dd');

            // Fetch students
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (studentsError) {
                setError(`Gagal memuat data siswa: ${studentsError.message}`);
                setLoading(false);
                return;
            }
            setStudents(studentsData);
            setStudentCount(studentsData.length);

            // Fetch today's attendance records
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance_records')
                .select('student_id, hour, status')
                .eq('date', today);
            
            if (attendanceError) {
                console.error("Gagal memuat absensi:", attendanceError.message);
            }
            
            if (attendanceData) {
                const newAttendance: Record<string, Record<number, AttendanceStatus>> = {};
                for (const record of attendanceData) {
                    if (!newAttendance[record.student_id]) {
                        newAttendance[record.student_id] = {};
                    }
                    newAttendance[record.student_id][record.hour] = record.status as AttendanceStatus;
                }
                setAttendance(newAttendance);
            }

            setLoading(false);
        };

        fetchData();
    }, [setStudentCount]);

    const handleAttendanceChange = async (studentId: string, studentName: string, hour: number, status: AttendanceStatus) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const oldStatus = attendance[studentId]?.[hour] || AttendanceStatus.Pending;

        // Optimistic UI update
        const tempAttendance = JSON.parse(JSON.stringify(attendance));
        if (!tempAttendance[studentId]) tempAttendance[studentId] = {};
        tempAttendance[studentId][hour] = status;
        setAttendance(tempAttendance);

        const { error } = await supabase.from('attendance_records').upsert({
            student_id: studentId,
            date: today,
            hour: hour,
            status: status,
            updated_by: currentUser.id
        }, { onConflict: 'student_id, date, hour' });
        
        if (error) {
            // Revert UI on error
            console.error("Failed to update attendance:", error);
            setError(`Gagal menyimpan absensi untuk ${studentName}. Coba lagi.`);
            const revertedAttendance = JSON.parse(JSON.stringify(attendance));
            if (!revertedAttendance[studentId]) revertedAttendance[studentId] = {};
            revertedAttendance[studentId][hour] = oldStatus; // Revert to old status
            setAttendance(revertedAttendance);
        } else {
            const statusText = {
                [AttendanceStatus.Hadir]: "Hadir",
                [AttendanceStatus.Izin]: "Izin",
                [AttendanceStatus.Sakit]: "Sakit",
                [AttendanceStatus.Alpa]: "Alpa",
            }[status] || "Pending";
            addAuditLog('ABSENSI', `Menandai ${studentName} sebagai ${statusText} pada Jam ke-${hour}`);
        }
    };

    const getDailyPercentage = (studentId: string) => {
        const studentAttendance = attendance[studentId] || {};
        const attended = Object.values(studentAttendance).filter(s => s === AttendanceStatus.Hadir).length;
        return (attended / JAM_PELAJARAN.length) * 100;
    };

    const StatusButton: React.FC<{studentId: string, studentName: string, hour: number}> = ({ studentId, studentName, hour }) => {
        const currentStatus = attendance[studentId]?.[hour] || AttendanceStatus.Pending;
        const statuses = [AttendanceStatus.Hadir, AttendanceStatus.Izin, AttendanceStatus.Sakit, AttendanceStatus.Alpa];
        
        const getStatusInfo = (status: AttendanceStatus) => {
            switch(status) {
                case AttendanceStatus.Hadir: return { color: 'bg-green-500', text: 'H' };
                case AttendanceStatus.Izin: return { color: 'bg-blue-500', text: 'I' };
                case AttendanceStatus.Sakit: return { color: 'bg-yellow-500', text: 'S' };
                case AttendanceStatus.Alpa: return { color: 'bg-red-500', text: 'A' };
                default: return { color: 'bg-gray-300', text: '' };
            }
        };

        const cycleStatus = () => {
            const currentIndex = statuses.indexOf(currentStatus);
            const nextIndex = currentStatus === AttendanceStatus.Pending ? 0 : (currentIndex + 1) % statuses.length;
            handleAttendanceChange(studentId, studentName, hour, statuses[nextIndex]);
        };
        
        const { color, text } = getStatusInfo(currentStatus);

        return (
            <button 
                onClick={cycleStatus} 
                className={`w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm transition-all duration-200 transform hover:scale-110 ${color}`}
            >
                {text}
            </button>
        )
    }

    const handleImportComplete = async (newStudents: Omit<Student, 'id' | 'created_at' | 'is_active'>[]) => {
        const { data, error } = await supabase.from('students').insert(newStudents).select();

        if (error) {
            setError(`Gagal mengimpor siswa: ${error.message}`);
        } else if (data) {
            setStudents(prev => [...prev, ...data].sort((a,b) => a.name.localeCompare(b.name)));
            setStudentCount(prev => prev + data.length);
            addAuditLog('IMPOR DATA', `Mengimpor ${data.length} siswa baru.`);
        }
        setImportModalOpen(false);
    }
    
    const openAddModal = () => {
        setEditingStudent(null);
        setStudentFormModalOpen(true);
    };

    const openEditModal = (student: Student) => {
        setEditingStudent(student);
        setStudentFormModalOpen(true);
    };
    
    const handleSaveStudent = async (studentData: Omit<Student, 'id' | 'created_at'>) => {
        if (editingStudent) {
            const { data, error } = await supabase.from('students').update(studentData).eq('id', editingStudent.id).select().single();
            if (error) {
                setError(`Gagal memperbarui siswa: ${error.message}`);
            } else if (data) {
                setStudents(students.map(s => s.id === data.id ? data : s));
                addAuditLog('EDIT SISWA', `Memperbarui data siswa ${data.name}.`);
            }
        } else {
            const { data, error } = await supabase.from('students').insert(studentData).select().single();
            if (error) {
                setError(`Gagal menambah siswa: ${error.message}`);
            } else if (data) {
                setStudents([...students, data].sort((a,b) => a.name.localeCompare(b.name)));
                setStudentCount(prev => prev + 1);
                addAuditLog('TAMBAH SISWA', `Menambahkan siswa baru: ${data.name}.`);
            }
        }
        setStudentFormModalOpen(false);
    };

    const handleDeleteStudent = async (student: Student) => {
        if (window.confirm(`Apakah Anda yakin ingin menonaktifkan siswa ${student.name}? Data absensi mereka akan tetap tersimpan.`)) {
            const { error } = await supabase.from('students').update({ is_active: false }).eq('id', student.id);
            if (error) {
                setError(`Gagal menonaktifkan siswa: ${error.message}`);
            } else {
                setStudents(students.filter(s => s.id !== student.id));
                setStudentCount(prev => prev - 1);
                addAuditLog('HAPUS SISWA', `Menonaktifkan siswa: ${student.name}.`);
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Siswa & Absensi Harian</h1>
                <div className="flex space-x-2">
                    <Button onClick={openAddModal} variant="secondary">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Tambah Siswa
                    </Button>
                    <Button onClick={() => setImportModalOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Impor dari Excel
                    </Button>
                </div>
            </div>
            
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            <Card>
                {loading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-600"/>
                        <p className="ml-4 text-gray-600">Memuat data siswa dan absensi...</p>
                    </div>
                ) : (
                <div className="overflow-auto max-h-[calc(100vh-250px)]">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-20">
                            <tr>
                                <th scope="col" className="px-6 py-3 sticky left-0 bg-gray-100 z-30 w-1/4">Nama Siswa</th>
                                <th scope="col" className="px-2 py-3">Kelas</th>
                                {JAM_PELAJARAN.map(jam => (
                                    <th key={jam} scope="col" className="px-2 py-3 text-center w-12">{`J-${jam}`}</th>
                                ))}
                                <th scope="col" className="px-4 py-3 text-center">Kehadiran</th>
                                <th scope="col" className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => {
                                const percentage = getDailyPercentage(student.id);
                                return (
                                <tr key={student.id} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white hover:bg-gray-50 z-10">
                                        {student.name}
                                    </th>
                                    <td className="px-2 py-4">{student.class_name}</td>
                                    {JAM_PELAJARAN.map(jam => (
                                        <td key={jam} className="px-2 py-4 text-center">
                                            <StatusButton studentId={student.id} studentName={student.name} hour={jam} />
                                        </td>
                                    ))}
                                    <td className="px-4 py-4 text-center">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                        <span className="text-xs font-semibold">{percentage.toFixed(0)}%</span>
                                    </td>
                                    <td className="px-4 py-4 text-center space-x-2">
                                        <button onClick={() => openEditModal(student)} className="p-1 text-blue-600 hover:text-blue-800" title="Edit Siswa">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDeleteStudent(student)} className="p-1 text-red-600 hover:text-red-800" title="Nonaktifkan Siswa">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                )}
            </Card>

            <ImportModal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} onImport={handleImportComplete} addAuditLog={addAuditLog} />
            {isStudentFormModalOpen && (
                <StudentFormModal 
                    isOpen={isStudentFormModalOpen}
                    onClose={() => setStudentFormModalOpen(false)}
                    onSave={handleSaveStudent}
                    student={editingStudent}
                />
            )}
        </div>
    );
};

export default Students;