import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mfjafqxrfpfkwyroendp.supabase.co";
const supabasePublishableKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mamFmcXhyZnBma3d5cm9lbmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDQ0MTgsImV4cCI6MjA2NTM4MDQxOH0.LI3bPG_kFe4d1TCz5pUV2X05dicHuGDK0PB_pT3fBuI";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
