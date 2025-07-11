export enum UserRole {
  TEACHER = 'teacher',
  PARENT = 'parent',
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface Student {
  id: string;
  full_name: string;
  grade: number; // 10, 11, 12
  class_letter: 'A' | 'B';
  gender: 'L' | 'P';
  nisn?: string;
  parent_id?: string;
}

export enum AttendanceStatus {
  PRESENT = 'Hadir',
  SICK = 'Sakit',
  PERMISSION = 'Izin',
  ABSENT = 'Alpa',
  SLEEPING = 'Tidur',
}

export interface AttendanceRecord {
  id?: number;
  student_id: string;
  date: string; // YYYY-MM-DD
  lesson_hour: number;
  status: AttendanceStatus;
  taken_by_teacher_id: string;
  student_name?: string; // for joining
}

export interface AuditLogEntry {
    id: number;
    created_at: string;
    user_email: string;
    action: string;
}