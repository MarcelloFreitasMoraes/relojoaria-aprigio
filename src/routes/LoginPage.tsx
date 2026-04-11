import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { auth } from '../services/firebase'
import '../styles/auth.css'

type Mode = 'login' | 'register'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('login')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }

      navigate('/orders')
    } catch (err: any) {
      setError(
        mode === 'login'
          ? 'Não foi possível entrar. Verifique e-mail e senha.'
          : 'Não foi possível cadastrar. Verifique os dados e tente novamente.',
      )
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
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
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
                onClick={() => setMode('register')}
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
                onClick={() => setMode('login')}
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

