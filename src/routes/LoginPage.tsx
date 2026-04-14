import { type FormEvent, useState } from 'react'
import { useFormik } from 'formik'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { reload, updateProfile } from 'firebase/auth'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { auth } from '../services/firebase'
import { salvarPerfilUsuarioRtdb } from '../services/realtimeDatabase'
import { usernameToAuthEmail } from '../utils/authUsername'
import {
  loginPageSchema,
  type LoginPageFormValues,
} from '@/schemas/loginPageSchema'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import '../styles/auth.css'

const initialValues: LoginPageFormValues = {
  username: '',
  password: '',
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const formik = useFormik<LoginPageFormValues>({
    initialValues,
    validationSchema: loginPageSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        let authEmail: string
        try {
          authEmail = usernameToAuthEmail(values.username)
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Usuário inválido. Verifique e tente novamente.'
          toast.error(message)
          return
        }

        const displayName = values.username.trim()

        async function sincronizarPerfilRtdb(uid: string) {
          try {
            await salvarPerfilUsuarioRtdb(uid, displayName)
          } catch {
            console.warn(
              '[login] RTDB /usuarios: sem permissão ou regras não publicadas.',
            )
            toast.warning(
              'Login ok, mas o perfil não foi gravado no Realtime Database. Publique as regras com o nó `usuarios` (ver database.rules.json) ou ajuste na consola Firebase.',
              { duration: 8000 },
            )
          }
        }

        await signIn(authEmail, values.password)
        const u = auth.currentUser
        if (u) {
          await updateProfile(u, { displayName })
          await reload(u)
          await sincronizarPerfilRtdb(u.uid)
        }

        toast.success('Login efetuado.')
        navigate('/orders')
      } catch (err: unknown) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : ''
        if (code === 'auth/invalid-credential') {
          toast.error('Usuário ou senha incorretos.')
        } else if (code === 'auth/user-not-found') {
          toast.error('Usuário não encontrado.')
        } else if (err instanceof Error && err.message.startsWith('Usuário')) {
          toast.error(err.message)
        } else {
          toast.error('Não foi possível entrar. Verifique usuário e senha.')
        }
      } finally {
        setSubmitting(false)
      }
    },
  })

  async function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = await formik.validateForm()
    if (Object.keys(errs).length > 0) {
      const msg =
        (typeof errs.username === 'string' && errs.username) ||
        (typeof errs.password === 'string' && errs.password) ||
        'Verifique os campos e tente novamente.'
      toast.error(msg)
      void formik.setTouched({ username: true, password: true })
      return
    }
    await formik.submitForm()
  }

  return (
    <div className="auth-layout">
      <Card
        className={cn('auth-card w-full max-w-[420px] gap-0 py-0 ring-0')}
      >
        <CardHeader className="auth-header px-0 pb-0">
          <CardTitle className="text-[1.6rem] font-normal uppercase leading-tight tracking-[0.08em] text-slate-900">
            Relojoaria Aprígio
          </CardTitle>
          <CardDescription className="mt-1.5 text-[0.95rem] text-[#6b7280]">
            Sistema interno de ordens de serviço
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 pb-0 pt-0">
        <form className="auth-form" onSubmit={handleFormSubmit} noValidate>
          <div className="auth-field">
            <Label htmlFor="username" className="auth-label">
              Usuário
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="ex.: maria.silva"
              className="auth-input"
              value={formik.values.username}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              aria-invalid={Boolean(
                formik.touched.username && formik.errors.username,
              )}
            />
            {formik.touched.username && formik.errors.username ? (
              <p className="auth-field-error" role="alert">
                {formik.errors.username}
              </p>
            ) : null}
          </div>

          <div className="auth-field">
            <Label htmlFor="password" className="auth-label">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={cn('auth-input', 'pr-11')}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                aria-invalid={Boolean(
                  formik.touched.password && formik.errors.password,
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-1.5 size-8 -translate-y-1/2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="size-4 cursor-pointer" aria-hidden />
                ) : (
                  <Eye className="size-4 cursor-pointer" aria-hidden />
                )}
              </Button>
            </div>
            {formik.touched.password && formik.errors.password ? (
              <p className="auth-field-error" role="alert">
                {formik.errors.password}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={formik.isSubmitting}
            className={cn(
              'auth-submit',
              'h-auto min-h-10 gap-2 rounded-full border-0 px-4 py-2.5 text-base font-semibold',
              'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-[0_12px_30px_rgba(79,70,229,0.45)]',
              'hover:bg-linear-to-r hover:from-indigo-500 hover:to-violet-500 hover:shadow-[0_16px_40px_rgba(79,70,229,0.6)]',
              'disabled:opacity-70 disabled:shadow-none',
            )}
            size="lg"
          >
            {formik.isSubmitting ? (
              <>
                <LoaderCircle
                  className="shrink-0 animate-spin"
                  size={16}
                  aria-hidden
                />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
        </CardContent>

        <CardFooter className="auth-footer flex flex-col items-center border-0 bg-transparent p-0 pt-0">
          Uso exclusivo interno – acesso restrito.
        </CardFooter>
      </Card>
    </div>
  )
}
