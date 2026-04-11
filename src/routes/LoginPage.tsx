import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { auth } from '../services/firebase'
import { salvarLoginRtdb } from '../services/realtimeDatabase'
import { usernameToAuthEmail } from '../utils/authUsername'
import '../styles/auth.css'

type Mode = 'login' | 'register'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('login')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const authEmail = usernameToAuthEmail(username)

      if (mode === 'login') {
        await signIn(authEmail, password)
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, password)
        await salvarLoginRtdb(username, password)
      }

      navigate('/orders')
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : ''
      if (mode === 'register' && code === 'auth/email-already-in-use') {
        setError('Este usuário já está cadastrado. Faça login ou use outro nome.')
      } else if (mode === 'login' && code === 'auth/invalid-credential') {
        setError('Usuário ou senha incorretos.')
      } else if (mode === 'login' && code === 'auth/user-not-found') {
        setError('Usuário não encontrado.')
      } else if (err instanceof Error && err.message.startsWith('Usuário')) {
        setError(err.message)
      } else {
        setError(
          mode === 'login'
            ? 'Não foi possível entrar. Verifique usuário e senha.'
            : 'Não foi possível cadastrar. Verifique os dados e tente novamente.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <header className="auth-header">
          <h1>Relojoaria Aprígio</h1>
          <p>Sistema interno de ordens de serviço</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Usuário</span>
            <input
              type="text"
              value={username}
              autoComplete="username"
              placeholder="ex.: maria.silva"
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? isLogin
                ? 'Entrando...'
                : 'Cadastrando...'
              : isLogin
                ? 'Entrar'
                : 'Cadastrar'}
          </button>
        </form>

        <p className="auth-footer">
          {isLogin ? (
            <>
              Uso exclusivo interno – acesso restrito.{' '}
              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setMode('register')
                  setError(null)
                }}
              >
                Cadastrar novo usuário
              </button>
            </>
          ) : (
            <>
              Já tem cadastro?{' '}
              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
              >
                Fazer login
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
