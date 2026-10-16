import { useEffect, useState } from 'react'
import type { User } from '@bench/shared'
import { getMe, logout } from '@/api'
import { AuthScreen } from '@/components/AuthScreen'
import { BoardIndex } from '@/components/BoardIndex'
import { BoardView } from '@/components/BoardView'

type Session =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'ready'; user: User }

function boardFromLocation(): string | null {
  return new URLSearchParams(window.location.search).get('board')
}

export default function App() {
  const [session, setSession] = useState<Session>({ status: 'loading' })
  const [boardId, setBoardId] = useState<string | null>(() => boardFromLocation())

  useEffect(() => {
    let cancel = false
    getMe()
      .then((result) => { if (!cancel) setSession({ status: 'ready', user: result.user }) })
      .catch(() => { if (!cancel) setSession({ status: 'anon' }) })
    return () => { cancel = true }
  }, [])

  useEffect(() => {
    const onPop = () => setBoardId(boardFromLocation())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function openBoard(id: string) {
    const url = new URL(window.location.href)
    url.searchParams.set('board', id)
    window.history.pushState({}, '', url)
    setBoardId(id)
  }

  function closeBoard() {
    const url = new URL(window.location.href)
    url.searchParams.delete('board')
    window.history.pushState({}, '', url)
    setBoardId(null)
  }

  if (session.status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Checking your session">
        <p className="font-display text-2xl">Checking your session…</p>
      </div>
    )
  }

  if (session.status === 'anon') {
    return <AuthScreen onAuthenticated={(user) => setSession({ status: 'ready', user })} />
  }

  if (!boardId) {
    return (
      <BoardIndex
        user={session.user}
        onOpen={openBoard}
        onSignedOut={() => setSession({ status: 'anon' })}
      />
    )
  }

  return (
    <BoardView
      user={session.user}
      boardId={boardId}
      onBack={closeBoard}
      onSignedOut={() => {
        void logout().finally(() => setSession({ status: 'anon' }))
      }}
    />
  )
}
