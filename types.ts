
export interface Student {
  id: number;
  name: string;
  class: string;
  nis: string;
  email: string | null;
}

export enum AttendanceStatus {
  Hadir = 'Hadir',
  Sakit = 'Sakit',
  Izin = 'Izin',
  Alfa = 'Alfa',
}

export interface AttendanceRecord {
  id: number;
  studentId: number;
  date: string; // YYYY-MM-DD
  lessonHour: number;
  status: AttendanceStatus;
}

export type View = 'dashboard' | 'students' | 'attendance' | 'recap' | 'studentDetail';

export interface RecapData {
  studentId: number;
  studentName: string;
  studentClass: string;
  hadir: number;
  sakit: number;
  izin: number;
  alfa: number;
  totalHours: number;
  presencePercentage: number;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}
