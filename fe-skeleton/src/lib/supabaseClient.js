import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // 브라우저 로컬(IndexedDB)로 세션 자동 유지
    persistSession: true,
    autoRefreshToken: true,
  },
})
