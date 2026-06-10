export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const inferenceUrl =
  process.env.NEXT_PUBLIC_YELO_INFERENCE_URL ?? "http://127.0.0.1:8000";
export const turnUrl = process.env.NEXT_PUBLIC_YELO_TURN_URL;
export const turnUsername = process.env.NEXT_PUBLIC_YELO_TURN_USERNAME;
export const turnCredential = process.env.NEXT_PUBLIC_YELO_TURN_CREDENTIAL;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
