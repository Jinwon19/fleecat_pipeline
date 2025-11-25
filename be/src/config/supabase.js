const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error('Supabase URL, Service Key, and Anon Key must be provided');
}

/**
 * Supabase Admin Client
 * - SERVICE_ROLE_KEY 사용
 * - 서버 측 관리 작업용 (RLS 우회)
 * - 사용자 생성, 삭제, 수정 등
 */
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Supabase Client
 * - ANON_KEY 사용
 * - 소셜 로그인 OAuth 플로우용
 * - 클라이언트와 동일한 권한
 */
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

module.exports = {
  supabaseAdmin,
  supabaseClient,
  supabase: supabaseAdmin // 하위 호환성 (기존 코드)
};
