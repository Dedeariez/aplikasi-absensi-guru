
import React from 'react';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import { FileText, FileSpreadsheet } from 'lucide-react';
import Input from './ui/Input.tsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const Reports: React.FC = () => {
    
    // Mock data
    const reportData = [
        { name: 'Ahmad Fauzi', class: '10-A', hadir: 18, sakit: 1, izin: 1, alpa: 0, total: 20 },
        { name: 'Siti Aminah', class: '10-B', hadir: 20, sakit: 0, izin: 0, alpa: 0, total: 20 },
        { name: 'Budi Santoso', class: '11-A', hadir: 15, sakit: 2, izin: 1, alpa: 2, total: 20 },
        { name: 'Dewi Lestari', class: '12-B', hadir: 19, sakit: 0, izin: 1, alpa: 0, total: 20 },
    ];

    const getPercentage = (hadir: number, total: number) => total > 0 ? ((hadir / total) * 100).toFixed(1) + '%' : '0%';

    const handleDownloadExcel = () => {
        const headers = ['Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Persentase'];
        const csvRows = [
            headers.join(','),
            ...reportData.map(row => [
                `"${row.name}"`,
                row.class,
                row.hadir,
                row.sakit,
                row.izin,
                row.alpa,
                `"${getPercentage(row.hadir, row.total)}"`
            ].join(','))
        ];
        
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "laporan_absensi_juli_2024.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPdf = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Rekapitulasi Absensi - Juli 2024", 14, 22);
        
        autoTable(doc, {
            startY: 30,
            head: [['Nama Siswa', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Persentase']],
            body: reportData.map(row => [
                row.name,
                row.class,
                row.hadir,
                row.sakit,
                row.izin,
                row.alpa,
                getPercentage(row.hadir, row.total)
            ]),
            headStyles: { fillColor: [22, 163, 74] }, // primary-600 color
            styles: { halign: 'center' },
            columnStyles: { 0: { halign: 'left' } },
        });

        doc.save('laporan_absensi_juli_2024.pdf');
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Laporan Absensi</h1>

            <Card className="mb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div className='flex-1 min-w-[200px]'>
                        <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">Jenis Laporan</label>
                        <select id="reportType" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
                            <option>Bulanan</option>
                            <option>Mingguan</option>
                            <option>Semester</option>
                        </select>
                    </div>
                     <div className='flex-1 min-w-[200px]'>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Pilih Bulan</label>
                        <Input id="date" type="month" defaultValue="2024-07" />
                    </div>
                     <div className='flex-1 min-w-[200px]'>
                        <label htmlFor="classFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter Kelas</label>
                        <select id="classFilter" className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
                            <option>Semua Kelas</option>
                            <option>Kelas 10</option>
                            <option>Kelas 11</option>
                            <option>Kelas 12</option>
                        </select>
                    </div>
                    <Button>Tampilkan Laporan</Button>
                </div>
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Rekapitulasi Absensi - Juli 2024</h2>
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
                                <th scope="col" className="px-6 py-3 text-center">Persentase</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row) => (
                                <tr key={row.name} className="bg-white border-b hover:bg-gray-50">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{row.name}</th>
                                    <td className="px-6 py-4">{row.class}</td>
                                    <td className="px-6 py-4 text-center">{row.hadir}</td>
                                    <td className="px-6 py-4 text-center">{row.sakit}</td>
                                    <td className="px-6 py-4 text-center">{row.izin}</td>
                                    <td className="px-6 py-4 text-center">{row.alpa}</td>
                                    <td className="px-6 py-4 text-center font-semibold text-gray-800">{getPercentage(row.hadir, row.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Reports;