import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthScreen } from './AuthScreen'

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('signs in with email and password', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: '1', email: 'ada@example.com', name: 'Ada' } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const onAuthenticated = vi.fn()
    render(<AuthScreen onAuthenticated={onAuthenticated} />)

    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
    expect(onAuthenticated).toHaveBeenCalledWith({ id: '1', email: 'ada@example.com', name: 'Ada' })
  })

  it('asks for a name when creating an account', async () => {
    const user = userEvent.setup()
    render(<AuthScreen onAuthenticated={vi.fn()} />)
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Create account' }))
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('shows the server error', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } }),
    }))
    render(<AuthScreen onAuthenticated={vi.fn()} />)
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
  })
})
