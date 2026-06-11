'use server'

import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Email e password obbligatorie' }
  if (password.length < 6) return { error: 'La password deve essere di almeno 6 caratteri' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }

  return { success: true }
}
