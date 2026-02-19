'use client'

import { useState, useEffect } from 'react'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

import { auth, db } from '../../lib/firebase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// Definición de tipos para el formulario
interface AuthForm {
  email: string;
  password: string;
  name: string;
  department: string;
  role: string;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [mounted, setMounted] = useState<boolean>(false)
  const router = useRouter()

  // Evitar problemas de hidratación con las animaciones
  useEffect(() => {
    setMounted(true)
  }, [])

  const [form, setForm] = useState<AuthForm>({
    email: '',
    password: '',
    name: '',
    department: 'marketing',
    role: 'operativo',
  })

  // Tipado correcto del evento change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  // Tipado correcto del submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, form.email, form.password)
        // Redirigir al dashboard u home después del login
        router.push('/') 
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password)
        const user = userCredential.user
        
        await updateProfile(user, { displayName: form.name })
        
        await setDoc(doc(db, 'users', user.uid), {
          email: form.email,
          name: form.name,
          department: form.department,
          role: form.role,
          avatar: form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          isActive: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        })
        
        router.push('/')
      }
    } catch (err: any) { // Tipado explícito de 'err' como any para acceder a .code
      const errorMessages: Record<string, string> = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/invalid-email': 'Correo inválido',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/invalid-credential': 'Credenciales incorrectas',
        'auth/user-not-found': 'No existe una cuenta con este correo',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      }
      setError(errorMessages[err?.code] || `Error: ${err?.message || 'Desconocido'}`)
      setLoading(false)
    }
  }

  // Estilos para inputs reutilizables
  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: 'white',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.3s ease',
  }

  // Función para efectos de foco
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#6366f1'
    e.target.style.background = 'rgba(99, 102, 241, 0.1)'
    e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)'
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
    e.target.style.background = 'rgba(255, 255, 255, 0.05)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#0a0a0f',
      display: 'flex',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* --- FONDO ANIMADO --- */}
      <div className="background-animate">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        width: '100%',
        maxWidth: '1600px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>

        {/* --- IZQUIERDA: LOGO Y TEXTO --- */}
        <div className="brand-section">
          <div className={`brand-content ${mounted ? 'fade-in' : ''}`}>
            <div className="logo-container">
              <div className="logo-glow" />
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image
                  src="/LogoInformacion.png"
                  alt="SOLISCENTER"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            </div>
            
            <h1 className="brand-title">SOLISCENTER</h1>
            <p className="brand-subtitle">
              Gestión inteligente de equipos de alto rendimiento.
            </p>
          </div>
        </div>

        {/* --- DERECHA: FORMULARIO --- */}
        <div className="form-section">
          <div className={`form-card ${mounted ? 'slide-up' : ''}`}>
            
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
                {isLogin ? 'Bienvenido' : 'Crear Cuenta'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
                {isLogin ? 'Ingresa a tu espacio de trabajo' : 'Registra tus datos para comenzar'}
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5',
                padding: '14px',
                borderRadius: '12px',
                marginBottom: '24px',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {!isLogin && (
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required={!isLogin}
                  placeholder="Nombre completo"
                  style={inputStyles}
                  autoComplete="name"
                />
              )}

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
                placeholder="Correo electrónico"
                style={inputStyles}
                autoComplete="email"
              />

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
                placeholder="Contraseña"
                minLength={6}
                style={inputStyles}
                autoComplete="current-password"
              />

              {!isLogin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ ...inputStyles, cursor: 'pointer', appearance: 'none' }}
                  >
                    <option value="marketing" style={{background: '#1a1a20'}}>Marketing</option>
                    <option value="openers" style={{background: '#1a1a20'}}>Openers</option>
                    <option value="closers" style={{background: '#1a1a20'}}>Closers</option>
                    <option value="admin" style={{background: '#1a1a20'}}>Admin</option>
                    <option value="finanzas" style={{background: '#1a1a20'}}>Finanzas</option>
                  </select>

                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ ...inputStyles, cursor: 'pointer', appearance: 'none' }}
                  >
                    <option value="operativo" style={{background: '#1a1a20'}}>Operativo</option>
                    <option value="lider" style={{background: '#1a1a20'}}>Líder</option>
                    <option value="gerente" style={{background: '#1a1a20'}}>Gerente</option>
                    <option value="director" style={{background: '#1a1a20'}}>Director</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="submit-btn"
                style={{
                  marginTop: '10px',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 10px 30px -10px rgba(99, 102, 241, 0.5)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
              </button>

            </form>

            <div style={{ marginTop: '30px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              </span>
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a78bfa',
                  fontWeight: '600',
                  marginLeft: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'color 0.2s'
                }}
              >
                {isLogin ? 'Crear cuenta' : 'Ingresar'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* --- ESTILOS CSS GLOBALES PARA ANIMACIONES --- */}
      <style jsx global>{`
        .background-animate {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: float 10s infinite ease-in-out alternate;
        }
        
        .blob-1 {
          width: 500px; height: 500px;
          background: #4f46e5;
          top: -10%; left: -10%;
        }
        
        .blob-2 {
          width: 600px; height: 600px;
          background: #7c3aed;
          bottom: -10%; right: -10%;
          animation-delay: -5s;
        }

        .blob-3 {
          width: 300px; height: 300px;
          background: #ec4899;
          top: 40%; left: 40%;
          opacity: 0.2;
          animation-duration: 15s;
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, 50px) scale(1.1); }
        }

        .brand-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px;
        }

        .brand-content {
          text-align: center;
          opacity: 0;
          transform: translateY(20px);
        }

        .brand-content.fade-in {
          animation: fadeIn 1s ease forwards;
        }

        .logo-container {
          position: relative;
          width: 300px;
          height: 300px;
          margin: 0 auto 40px;
        }

        .logo-glow {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 120%; height: 120%;
          background: radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%);
          filter: blur(40px);
        }

        .brand-title {
          font-size: 56px;
          font-weight: 800;
          color: white;
          margin: 0 0 16px;
          letter-spacing: -2px;
          text-shadow: 0 0 40px rgba(99,102,241,0.3);
        }

        .brand-subtitle {
          font-size: 20px;
          color: rgba(255,255,255,0.7);
          font-weight: 300;
        }

        .form-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .form-card {
          width: 100%;
          max-width: 460px;
          background: rgba(20, 20, 25, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          padding: 48px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          opacity: 0;
          transform: translateY(30px);
        }

        .form-card.slide-up {
          animation: slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          animation-delay: 0.2s;
        }

        @keyframes fadeIn {
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px -10px rgba(99, 102, 241, 0.6) !important;
        }
        
        .submit-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 1024px) {
          .brand-section { display: none; }
          .form-section { width: 100%; }
        }
      `}</style>
    </div>
  )
}