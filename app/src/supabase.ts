import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

export const configurato = SUPABASE_URL.startsWith('https://')

export const supabase = createClient(
  configurato ? SUPABASE_URL : 'https://esempio.supabase.co',
  configurato ? SUPABASE_KEY : 'chiave-mancante',
  { auth: { persistSession: true, autoRefreshToken: true } },
)
