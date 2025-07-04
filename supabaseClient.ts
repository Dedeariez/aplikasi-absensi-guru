
import { createClient } from '@supabase/supabase-js';

// --- START OF TYPE DEFINITIONS ---
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AttendanceStatusEnum = 'Hadir' | 'Sakit' | 'Izin' | 'Alfa';

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: number
          created_at: string
          name: string
          class: string
          nis: string
          email: string | null
          user_id: string
        }
        Insert: {
          id?: number
          created_at?: string
          name: string
          class: string
          nis?: string
          email?: string | null
          user_id: string
        }
        Update: {
          id?: number
          created_at?: string
          name?: string
          class?: string
          nis?: string
          email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance_records: {
        Row: {
          id: number
          created_at: string
          student_id: number
          date: string
          lesson_hour: number
          status: AttendanceStatusEnum
          user_id: string
        }
        Insert: {
          id?: number
          created_at?: string
          student_id: number
          date: string
          lesson_hour: number
          status: AttendanceStatusEnum
          user_id: string
        }
        Update: {
          id?: number
          created_at?: string
          student_id?: number
          date?: string
          lesson_hour?: number
          status?: AttendanceStatusEnum
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: { [key: string]: never }
    Functions: { [key: string]: never }
    Enums: {
      attendance_status: AttendanceStatusEnum
    }
    CompositeTypes: { [key: string]: never }
  }
}
// --- END OF TYPE DEFINITIONS ---


// WARNING: In a real-world application, DO NOT hardcode your credentials like this.
// These values should be stored securely in environment variables and accessed
// via `process.env.SUPABASE_URL` and `process.env.SUPABASE_KEY`.
// This is done here only for demonstration purposes in this specific sandboxed environment.
const supabaseUrl = 'https://qurvymoragyykcneuhxg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cnZ5bW9yYWd5eWtjbmV1aHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1OTUzNDMsImV4cCI6MjA2NzE3MTM0M30.RP-fTDIX-vMYevElUEjILaC5N_zFmV1vlfGp_UHFQYs';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);


/*
  ==============================================================
  SKEMA SQL SUPABASE YANG DIREKOMENDASIKAN (VERSI 4.0 - ROBUST UPDATE)
  ==============================================================
  
  Salin dan tempel SELURUH kode di bawah ini ke dalam SQL Editor di dashboard Supabase.
  Skrip ini akan MEMPERBAIKI skema lama dan menerapkan keamanan multi-pengguna.
  Aman untuk dijalankan berkali-kali.

  -- Bagian 1: Pastikan kolom 'user_id' ada di tabel yang ada.
  DO $$
  BEGIN
    -- Tambah kolom 'user_id' ke tabel 'students' jika belum ada
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.students ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE 'Kolom user_id berhasil ditambahkan ke tabel students.';
    END IF;
  
    -- Tambah kolom 'user_id' ke tabel 'attendance_records' jika belum ada
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'attendance_records' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.attendance_records ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      RAISE NOTICE 'Kolom user_id berhasil ditambahkan ke tabel attendance_records.';
    END IF;
  END $$;
  
  -- Bagian 2: Buat tabel jika belum ada (untuk instalasi baru).
  -- 2.1. Buat tipe ENUM jika belum ada.
  DO $$ BEGIN
      CREATE TYPE public.attendance_status AS ENUM ('Hadir', 'Sakit', 'Izin', 'Alfa');
  EXCEPTION
      WHEN duplicate_object THEN null;
  END $$;

  -- 2.2. Tabel 'students'.
  CREATE TABLE IF NOT EXISTS public.students (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    nis TEXT NOT NULL DEFAULT '',
    email TEXT
  );
  
  -- 2.3. Tabel 'attendance_records'.
  CREATE TABLE IF NOT EXISTS public.attendance_records (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    lesson_hour INTEGER NOT NULL,
    status public.attendance_status NOT NULL 
  );
  
  -- Bagian 3: Pastikan ada UNIQUE constraint yang benar untuk UPSERT per pengguna.
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS unique_attendance_record;
  ALTER TABLE public.attendance_records
    ADD CONSTRAINT unique_attendance_record UNIQUE (student_id, date, lesson_hour, user_id);

  -- Bagian 4: Aktifkan Row Level Security (RLS) pada kedua tabel.
  ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
  
  -- Bagian 5: Hapus semua kebijakan lama untuk memastikan tidak ada konflik.
  DROP POLICY IF EXISTS "Public Access" ON public.students;
  DROP POLICY IF EXISTS "Public Access" ON public.attendance_records;
  DROP POLICY IF EXISTS "Users can view their own students." ON public.students;
  DROP POLICY IF EXISTS "Users can insert their own students." ON public.students;
  DROP POLICY IF EXISTS "Users can update their own students." ON public.students;
  DROP POLICY IF EXISTS "Users can delete their own students." ON public.students;
  DROP POLICY IF EXISTS "Users can view their own attendance." ON public.attendance_records;
  DROP POLICY IF EXISTS "Users can insert their own attendance." ON public.attendance_records;
  DROP POLICY IF EXISTS "Users can update their own attendance." ON public.attendance_records;
  DROP POLICY IF EXISTS "Users can delete their own attendance." ON public.attendance_records;

  -- Bagian 6: Buat kebijakan RLS yang baru dan aman untuk tabel 'students'.
  CREATE POLICY "Users can view their own students." ON public.students FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users can insert their own students." ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update their own students." ON public.students FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "Users can delete their own students." ON public.students FOR DELETE USING (auth.uid() = user_id);

  -- Bagian 7: Buat kebijakan RLS yang baru dan aman untuk tabel 'attendance_records'.
  CREATE POLICY "Users can view their own attendance." ON public.attendance_records FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users can insert their own attendance." ON public.attendance_records FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update their own attendance." ON public.attendance_records FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "Users can delete their own attendance." ON public.attendance_records FOR DELETE USING (auth.uid() = user_id);

  RAISE NOTICE 'Skema database berhasil diperbarui dan kebijakan keamanan RLS telah diterapkan.';
*/
    