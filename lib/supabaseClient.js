// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bisjnzssegpfhkxaayuz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpc2puenNzZWdwZmhreGFheXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzg4NTEsImV4cCI6MjA3Mzk1NDg1MX0.YGwFiBrMAOLVjwHzU4C7kwvuS8WoAOVqVtOaneEUFzE'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})