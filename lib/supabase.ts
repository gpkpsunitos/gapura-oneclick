/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi konfigurasi dan inisialisasi klien Supabase untuk
 * koneksi ke database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Instance klien Supabase untuk interaksi dengan database
 * 
 * Klien ini menggunakan URL dan anon key dari environment variables
 * untuk menginisialisasi koneksi ke Supabase
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
