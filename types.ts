export interface User {
  id: string;
  name: string;
  email: string;
  role: 'guru' | 'orangtua';
}

export enum Gender {
  Male = 'L',
  Female = 'P',
}

export interface Student {
  id: string;
  created_at: string;
  name: string;
  class_level: 10 | 11 | 12;
  class_name: string; 
  gender: Gender;
  nisn?: string | null;
  dob?: string | null; 
  is_active: boolean;
}

export enum AttendanceStatus {
  Hadir = 'H',
  Izin = 'I',
  Sakit = 'S',
  Alpa = 'A',
  Pending = 'T' // Belum diabsen
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: { [hour: number]: AttendanceStatus }; // e.g., {1: 'H', 2: 'H', 3: 'S'}
}

export interface AuditLog {
  id: number;
  timestamp: Date;
  user_name: string | null;
  action: string;
  details: string;
  user_id?: string | null;
}

export interface ReportRow {
    student_id: string;
    name: string;
    class_name: string;
    hadir_count: number;
    sakit_count: number;
    izin_count: number;
    alpa_count: number;
    total_days: number;
}

export interface WeeklySummary {
    date: string;
    percentage: number;
}