import React, { useState, useEffect } from 'react';
import { Profile, Student, AttendanceStatus, AttendanceRecord } from '../types';
import { getStudents, addAuditLog, saveAttendanceRecords, getAttendanceForReport } from '../services/supabaseService';
import Card from './ui/Card';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import AdminView from './AdminView';
import StudentManagementView from './StudentManagementView';

const AttendanceTaker: React.FC<{profile: Profile, students: Student[]}> = ({ profile, students }) => {
    const [selectedClass, setSelectedClass] = useState('10A');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [lessonHour, setLessonHour] = useState(1);
    const [attendance, setAttendance] = useState<Map<string, AttendanceStatus>>(new Map());
    const [isLoading, setIsLoading] = useState(false);

    const studentsInClass = students.filter(s => `${s.grade}${s.class_letter}` === selectedClass);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => new Map(prev).set(studentId, status));
    };

    const saveAttendance = async () => {
        setIsLoading(true);
        const recordsToSave: Omit<AttendanceRecord, 'id' | 'student_name'>[] = [];
        
        const finalAttendance = new Map(attendance);
        studentsInClass.forEach(student => {
            if (!finalAttendance.has(student.id)) {
                finalAttendance.set(student.id, AttendanceStatus.PRESENT);
            }
        });

        for (const [studentId, status] of finalAttendance.entries()) {
            recordsToSave.push({
                student_id: studentId,
                date: selectedDate,
                lesson_hour: lessonHour,
                status: status,
                taken_by_teacher_id: profile.id
            });
        }
        
        try {
            await saveAttendanceRecords(recordsToSave);
            await addAuditLog(`Menyimpan absensi jam ke-${lessonHour} untuk kelas ${selectedClass} pada tanggal ${selectedDate}.`, profile.email);
            alert('Absensi berhasil disimpan!');
        } catch (error: any) {
            alert('Gagal menyimpan absensi. ' + (error.message || 'Silakan coba lagi.'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setAttendance(new Map());
    }, [selectedClass, selectedDate, lessonHour]);

    return (
        <Card>
            <h3 className="text-lg font-bold mb-4">Input Absensi Harian</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Pilih Kelas</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-darul-green-500 focus:border-darul-green-500 sm:text-sm rounded-md">
                        {['10A', '10B', '11A', '11B', '12A', '12B'].map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tanggal</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-darul-green-500 focus:border-darul-green-500 sm:text-sm rounded-md" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Jam Ke-</label>
                    <input type="number" min="1" max="12" value={lessonHour} onChange={e => setLessonHour(parseInt(e.target.value, 10))} className="mt-1 block w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-darul-green-500 focus:border-darul-green-500 sm:text-sm rounded-md" />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Kehadiran</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {studentsInClass.map(student => (
                            <tr key={student.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.full_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <select
                                        value={attendance.get(student.id) || AttendanceStatus.PRESENT}
                                        onChange={e => handleStatusChange(student.id, e.target.value as AttendanceStatus)}
                                        className="w-full rounded-md border-gray-300"
                                    >
                                        {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {studentsInClass.length === 0 && <p className="text-center py-4 text-gray-500">Tidak ada siswa di kelas ini.</p>}
            </div>

            <div className="mt-6 flex justify-end">
                <Button onClick={saveAttendance} disabled={isLoading || studentsInClass.length === 0}>
                    {isLoading ? <Spinner size="sm"/> : 'Simpan Absensi'}
                </Button>
            </div>
        </Card>
    );
};

const ReportDownloader: React.FC<{profile: Profile}> = ({ profile }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const processReportData = async () => {
        const reportData = await getAttendanceForReport();
        
        return reportData.map(student => {
            const present = student.records.filter(r => r.status === AttendanceStatus.PRESENT).length;
            const sick = student.records.filter(r => r.status === AttendanceStatus.SICK).length;
            const permission = student.records.filter(r => r.status === AttendanceStatus.PERMISSION).length;
            const absent = student.records.filter(r => r.status === AttendanceStatus.ABSENT).length;
            const sleeping = student.records.filter(r => r.status === AttendanceStatus.SLEEPING).length;
            const total = present + sick + permission + absent + sleeping;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

            return {
                "Nama Siswa": student.full_name,
                "Kelas": `${student.grade}${student.class_letter}`,
                "Hadir": present,
                "Sakit": sick,
                "Izin": permission,
                "Alpa": absent,
                "Tidur": sleeping,
                "Total Pertemuan": total,
                "Persentase Hadir (%)": percentage,
            };
        });
    }

    const handleDownloadCsv = async () => {
        setIsGenerating(true);
        try {
            const processedData = await processReportData();
            
            if (processedData.length === 0) {
                alert("Tidak ada data untuk dibuat laporan.");
                return;
            }
            
            await addAuditLog(`Mengunduh rekap absensi dalam format CSV.`, profile.email);

            const headers = Object.keys(processedData[0]);
            const csvContent = [
                headers.join(','),
                ...processedData.map(row => headers.map(header => {
                    let cell = row[header as keyof typeof row];
                    let cellString = (cell === null || cell === undefined) ? '' : String(cell);
                    if (cellString.includes(',') || cellString.includes('"')) {
                        cellString = `"${cellString.replace(/"/g, '""')}"`;
                    }
                    return cellString;
                }).join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "rekap_absensi.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Failed to generate report:", error);
            alert("Gagal membuat laporan. Silakan coba lagi.");
        } finally {
            setIsGenerating(false);
        }
    }

    const handleDownloadPdf = async () => {
        setIsGenerating(true);
        try {
            const processedData = await processReportData();

             if (processedData.length === 0) {
                alert("Tidak ada data untuk dibuat laporan.");
                return;
            }

            await addAuditLog(`Mengunduh rekap absensi dalam format PDF.`, profile.email);
            
            const doc = new jsPDF();
            const tableColumn = ["Nama Siswa", "Kelas", "Hadir", "Sakit", "Izin", "Alpa", "Tidur", "Total", "% Hadir"];
            const tableRows: (string | number)[][] = [];

            processedData.forEach(data => {
                const rowData = [
                    data["Nama Siswa"],
                    data["Kelas"],
                    data["Hadir"],
                    data["Sakit"],
                    data["Izin"],
                    data["Alpa"],
                    data["Tidur"],
                    data["Total Pertemuan"],
                    data["Persentase Hadir (%)"]
                ];
                tableRows.push(rowData);
            });

            doc.text("Rekapitulasi Absensi Siswa", 14, 15);
            (doc as any).autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 20,
            });
            doc.save('rekap_absensi.pdf');
        
        } catch (error) {
            console.error("Failed to generate report:", error);
            alert("Gagal membuat laporan. Silakan coba lagi.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Card>
            <h3 className="text-lg font-bold mb-4">Rekapitulasi & Laporan</h3>
            <p className="text-sm text-gray-600 mb-4">Unduh rekapitulasi absensi seluruh siswa dalam format CSV (Excel) atau PDF.</p>
            <div className="flex space-x-4">
                <Button onClick={handleDownloadCsv} disabled={isGenerating}>
                    {isGenerating ? <Spinner size="sm"/> : 'Unduh CSV (.csv)'}
                </Button>
                <Button onClick={handleDownloadPdf} variant="secondary" disabled={isGenerating}>
                    {isGenerating ? <Spinner size="sm"/> : 'Unduh PDF'}
                </Button>
            </div>
        </Card>
    );
}

const TeacherView: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentVersion, setStudentVersion] = useState(0); // State to trigger re-fetch

  const isSuperAdmin = profile.email === 'ayahnieda@gmail.com';

  const loadStudents = async () => {
      setLoading(true);
      const data = await getStudents();
      setStudents(data);
      setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, [studentVersion]); // Re-fetch students when version changes

  const tabs = [
    { id: 'attendance', label: 'Input Absensi' },
    { id: 'manage_students', label: 'Kelola Siswa' },
    { id: 'reports', label: 'Laporan' },
    ...(isSuperAdmin ? [{ id: 'admin', label: 'Admin Panel' }] : []),
  ];
  
  const renderContent = () => {
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }
    switch (activeTab) {
        case 'attendance':
            return <AttendanceTaker profile={profile} students={students} />;
        case 'manage_students':
            return <StudentManagementView profile={profile} students={students} onDataChanged={() => setStudentVersion(v => v + 1)} />;
        case 'reports':
            return <ReportDownloader profile={profile} />;
        case 'admin':
            return isSuperAdmin ? <AdminView profile={profile} /> : null;
        default:
            return null;
    }
  };

  return (
    <div>
        <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                            activeTab === tab.id
                            ? 'border-darul-green-500 text-darul-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
        <div>
            {renderContent()}
        </div>
    </div>
  );
};

export default TeacherView;