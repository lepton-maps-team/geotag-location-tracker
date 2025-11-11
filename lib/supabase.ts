import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://xengyefjbnoolmqyphxw.supabase.co"
const supabasePublishableKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlbmd5ZWZqYm5vb2xtcXlwaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzOTYzOTEsImV4cCI6MjA1NTk3MjM5MX0.5JFYQNXFe3Jn099q_CByr0t1WogjtXXDFFVAFXr7sgY"

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})