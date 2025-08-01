import React, { useState } from 'react';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import Input from './ui/Input.tsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabaseClient.ts';
import { ReportRow } from '../types.ts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';

const Reports: React.FC = () => {
    const [reportData, setReportData] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [classLevel, setClassLevel] = useState('0'); // 0 for all classes
    const [reportTitle, setReportTitle] = useState('');

    const getPercentage = (hadir: number, total: number) => total > 0 ? ((hadir / total) * 100).toFixed(1) + '%' : '0%';
    
    const handleGenerateReport = async () => {
        setLoading(true);
        setError('');
        setReportData([]);
        
        const selectedDate = new Date(`${month}-01T12:00:00`);
        const startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

        const { data, error: rpcError } = await supabase.rpc('get_report_data', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_class_level: parseInt(classLevel, 10)
        });

        if (rpcError) {
            setError(`Gagal mengambil data laporan: ${rpcError.message}`);
        } else if (data) {
            setReportData(data);
            const classText = classLevel === '0' ? 'Semua Kelas' : `Kelas ${classLevel}`;
            setReportTitle(`Rekapitulasi Absensi - ${format(selectedDate, 'MMMM yyyy', { locale: id })} - ${classText}`);
        }
        setLoading(false);
    };

    const handleDownloadExcel = () => {
        if (reportData.length === 0) return;
        const headers = ['Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Total Hari', 'Persentase'];
        const csvRows = [
            headers.join(','),
            ...reportData.map(row => [
                `"${row.name}"`,
                row.class_name,
                row.hadir_count,
                row.sakit_count,
                row.izin_count,
                row.alpa_count,
                row.total_days,
                `"${getPercentage(row.hadir_count, row.total_days)}"`
            ].join(','))
        ];
        
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${reportTitle.replace(/ /g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPdf = () => {
        if (reportData.length === 0) return;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(reportTitle, 14, 22);
        
        autoTable(doc, {
            startY: 30,
            head: [['Nama Siswa', 'Kelas', 'H', 'S', 'I', 'A', 'Total', 'Kehadiran']],
            body: reportData.map(row => [
                row.name,
                row.class_name,
                row.hadir_count,
                row.sakit_count,
                row.izin_count,
                row.alpa_count,
                row.total_days,
                getPercentage(row.hadir_count, row.total_days)
            ]),
            headStyles: { fillColor: [22, 163, 74] }, // primary-600 color
            styles: { halign: 'center', fontSize: 9 },
            columnStyles: { 0: { halign: 'left' } },
        });

        doc.save(`${reportTitle.replace(/ /g, '_')}.pdf`);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Laporan Absensi</h1>

            <Card className="mb-6">
                <div className="flex flex-wrap items-end gap-4">
                     <div className='flex-1 min-w-[200px]'>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Pilih Bulan</label>
                        <Input id="date" type="month" value={month} onChange={e => setMonth(e.target.value)} />
                    </div>
                     <div className='flex-1 min-w-[200px]'>
                        <label htmlFor="classFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter Kelas</label>
                        <select 
                            id="classFilter" 
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            value={classLevel}
                            onChange={e => setClassLevel(e.target.value)}
                        >
                            <option value="0">Semua Kelas</option>
                            <option value="10">Kelas 10</option>
                            <option value="11">Kelas 11</option>
                            <option value="12">Kelas 12</option>
                        </select>
                    </div>
                    <Button onClick={handleGenerateReport} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                        Tampilkan Laporan
                    </Button>
                </div>
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            </Card>
            
            {reportData.length > 0 && (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{reportTitle}</h2>
                    <div className="flex space-x-2">
                        <Button variant="secondary" size="sm" onClick={handleDownloadExcel}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Unduh Excel
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleDownloadPdf}>
                            <FileText className="w-4 h-4 mr-2" />
                            Unduh PDF
                        </Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama Siswa</th>
                                <th scope="col" className="px-6 py-3">Kelas</th>
                                <th scope="col" className="px-6 py-3 text-center">Hadir</th>
                                <th scope="col" className="px-6 py-3 text-center">Sakit</th>
                                <th scope="col" className="px-6 py-3 text-center">Izin</th>
                                <th scope="col" className="px-6 py-3 text-center">Alpa</th>
                                <th scope="col" className="px-6 py-3 text-center">Total Hari</th>
                                <th scope="col" className="px-6 py-3 text-center">Persentase</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row) => (
                                <tr key={row.student_id} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{row.name}</th>
                                    <td className="px-6 py-4">{row.class_name}</td>
                                    <td className="px-6 py-4 text-center">{row.hadir_count}</td>
                                    <td className="px-6 py-4 text-center">{row.sakit_count}</td>
                                    <td className="px-6 py-4 text-center">{row.izin_count}</td>
                                    <td className="px-6 py-4 text-center">{row.alpa_count}</td>
                                    <td className="px-6 py-4 text-center">{row.total_days}</td>
                                    <td className="px-6 py-4 text-center font-semibold text-gray-800">{getPercentage(row.hadir_count, row.total_days)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            )}
            
            {loading && (
                 <div className="flex items-center justify-center mt-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600"/>
                    <p className="ml-3 text-gray-600">Membuat laporan...</p>
                 </div>
            )}
        </div>
    );
};

export default Reports;