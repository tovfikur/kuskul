import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { signIn } from './authSlice'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const dispatch = useAppDispatch()
  const status = useAppSelector((s) => s.auth.status)
  const errorMessage = useAppSelector((s) => s.auth.errorMessage)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: FormValues) {
    await dispatch(signIn(values))
  }

  return (
    <div style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
      <h1>Sign in</h1>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <label>
          Email
          <input type="email" {...form.register('email')} />
        </label>
        <div style={{ color: 'crimson' }}>{form.formState.errors.email?.message}</div>

        <label>
          Password
          <input type="password" {...form.register('password')} />
        </label>
        <div style={{ color: 'crimson' }}>{form.formState.errors.password?.message}</div>

        {errorMessage ? <div style={{ color: 'crimson' }}>{errorMessage}</div> : null}

        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

