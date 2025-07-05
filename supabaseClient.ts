
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
        }
        Insert: {
          id?: number
          created_at?: string
          name: string
          class: string
          nis?: string
          email?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          name?: string
          class?: string
          nis?: string
          email?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          id: number
          created_at: string
          student_id: number
          date: string
          lesson_hour: number
          status: AttendanceStatusEnum
        }
        Insert: {
          id?: number
          created_at?: string
          student_id: number
          date: string
          lesson_hour: number
          status: AttendanceStatusEnum
        }
        Update: {
          id?: number
          created_at?: string
          student_id?: number
          date?: string
          lesson_hour?: number
          status?: AttendanceStatusEnum
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: { [key: string]: never }
    Functions: {
      save_class_attendance: {
        Args: {
          records_json: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status: AttendanceStatusEnum
    }
    CompositeTypes: { [key: string]: never }
  }
}
// --- END OF TYPE DEFINITIONS ---


// --- Supabase Client Initialization ---

// This setup is designed to work in two environments:
// 1. Vercel (Production): It uses VITE_... environment variables set in the Vercel dashboard.
// 2. Local Development: It uses the fallback placeholder values below.
//
// !! KREDENSIAL SUDAH DIMASUKKAN !!
// Nilai di bawah ini telah diisi dengan kredensial yang Anda berikan.
const LOCAL_DEV_SUPABASE_URL = "https://qurvymoragyykcneuhxg.supabase.co";
const LOCAL_DEV_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cnZ5bW9yYWd5eWtjbmV1aHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1OTUzNDMsImV4cCI6MjA2NzE3MTM0M30.RP-fTDIX-vMYevElUEjILaC5N_zFmV1vlfGp_UHFQYs";


const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || LOCAL_DEV_SUPABASE_URL;
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_KEY || LOCAL_DEV_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith('GANTI_DENGAN')) {
    const rootEl = document.getElementById('root');
    if (rootEl) {
        rootEl.innerHTML = `
            <div class="fixed inset-0 bg-red-50 text-red-700 p-4 flex justify-center items-center">
                <div class="bg-white p-8 rounded-lg shadow-2xl border-2 border-red-200 max-w-2xl text-center">
                    <h1 class="text-2xl font-bold mb-4">Error: Konfigurasi Supabase Diperlukan</h1>
                    <p class="text-slate-700 mb-4">
                        Aplikasi tidak dapat terhubung ke database. Silakan periksa konfigurasi Anda.
                    </p>
                    <div class="text-left bg-slate-50 p-4 rounded-md text-slate-600">
                        <p class="font-semibold mb-2">Petunjuk:</p>
                        <ul class="list-disc list-inside space-y-2">
                            <li>
                                <strong>Jika menjalankan secara lokal:</strong> Buka file <code>supabaseClient.ts</code>, cari konstanta <code>LOCAL_DEV_SUPABASE_URL</code> dan <code>LOCAL_DEV_SUPABASE_KEY</code>, lalu ganti nilainya dengan kredensial dari proyek Supabase Anda.
                            </li>
                            <li>
                                <strong>Jika mendeploy ke Vercel:</strong> Pastikan Anda telah mengatur Environment Variables <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_KEY</code> di pengaturan proyek Vercel Anda.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    throw new Error("Supabase URL and Key must be configured. Check supabaseClient.ts for local development or Vercel environment variables for production.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);


/*
  =====================================================================
  SKEMA SQL SUPABASE (VERSI 12.0 - FINALISASI MODEL KOLABORATIF)
  =====================================================================
  
  Salin dan tempel SELURUH kode di bawah ini ke dalam SQL Editor di dashboard Supabase.
  Skrip ini MENGHAPUS kolom 'user_id' yang sudah tidak diperlukan lagi, yang menjadi akar masalah
  kesulitan login bagi user baru. Ini adalah langkah terakhir untuk menstabilkan model data kolaboratif.
  Aman untuk dijalankan berkali-kali.

  -- Bagian 1: Hapus kolom 'user_id' dari tabel students jika ada.
  DO $$
  BEGIN
      IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'students'
          AND column_name = 'user_id'
      ) THEN
          ALTER TABLE public.students DROP COLUMN user_id;
      END IF;
  END $$;

  -- Bagian 2: Hapus kolom 'user_id' dari tabel attendance_records jika ada.
  DO $$
  BEGIN
      IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'attendance_records'
          AND column_name = 'user_id'
      ) THEN
          ALTER TABLE public.attendance_records DROP COLUMN user_id;
      END IF;
  END $$;

  -- Bagian 3: Pastikan tabel dan tipe dasar ada (jika dijalankan pada proyek baru)
  DO $$ BEGIN
      CREATE TYPE public.attendance_status AS ENUM ('Hadir', 'Sakit', 'Izin', 'Alfa');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE TABLE IF NOT EXISTS public.students (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    nis TEXT NOT NULL DEFAULT '',
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS public.attendance_records (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    student_id BIGINT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    lesson_hour INTEGER NOT NULL,
    status public.attendance_status NOT NULL
  );
  
  -- Bagian 4: Pastikan RLS dan unique constraint sudah benar.
  ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS unique_attendance_record;
  ALTER TABLE public.attendance_records ADD CONSTRAINT unique_attendance_record UNIQUE (student_id, date, lesson_hour);

  ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
  
  -- Bagian 5: Hapus kebijakan RLS lama dan pastikan kebijakan kolaboratif ada.
  DROP POLICY IF EXISTS "Users can view their own students" ON public.students;
  DROP POLICY IF EXISTS "Users can insert their own students" ON public.students;
  DROP POLICY IF EXISTS "Users can update their own students" ON public.students;
  DROP POLICY IF EXISTS "Users can delete their own students" ON public.students;
  DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance_records;
  DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance_records;
  DROP POLICY IF EXISTS "Users can update their own attendance" ON public.attendance_records;
  DROP POLICY IF EXISTS "Users can delete their own attendance" ON public.attendance_records;
  
  DROP POLICY IF EXISTS "Authenticated users can manage students" ON public.students;
  CREATE POLICY "Authenticated users can manage students"
    ON public.students FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Authenticated users can manage attendance" ON public.attendance_records;
  CREATE POLICY "Authenticated users can manage attendance"
    ON public.attendance_records FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

  -- Bagian 6: Perbarui fungsi RPC untuk bekerja tanpa user_id.
  -- Fungsi ini sudah tidak memerlukan SECURITY DEFINER karena RLS sudah mengizinkan akses.
  CREATE OR REPLACE FUNCTION public.save_class_attendance(records_json jsonb)
  RETURNS void
  LANGUAGE plpgsql
  AS $$
  DECLARE
      record jsonb;
      v_student_id bigint;
      v_date date;
      v_lesson_hour integer;
      v_status public.attendance_status;
  BEGIN
      FOR record IN (SELECT * FROM jsonb_array_elements(records_json))
      LOOP
          v_student_id  := (record->>'studentId')::bigint;
          v_date        := (record->>'date')::date;
          v_lesson_hour := (record->>'lessonHour')::integer;
          v_status      := (record->>'status')::public.attendance_status;

          IF v_student_id IS NULL OR v_date IS NULL OR v_lesson_hour IS NULL OR v_status IS NULL THEN
              RAISE EXCEPTION 'Data absensi tidak lengkap: %', record;
          END IF;

          INSERT INTO public.attendance_records (student_id, date, lesson_hour, status)
          VALUES (v_student_id, v_date, v_lesson_hour, v_status)
          ON CONFLICT (student_id, date, lesson_hour)
          DO UPDATE SET status = EXCLUDED.status;
      END LOOP;
  END;
  $$;
*/
