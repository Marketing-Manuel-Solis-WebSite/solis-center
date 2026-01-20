'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useRouter, usePathname } from 'next/navigation'

export interface User {
  id: string
  email: string
  name: string
  avatar: string
  department: string
  role: string
  isActive: boolean
}

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    console.log('AuthProvider: Iniciando listener de auth')
    
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log('AuthProvider: Estado de auth cambió', fbUser?.uid || 'sin usuario')
      
      if (fbUser) {
        setFirebaseUser(fbUser)
        
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
          console.log('AuthProvider: Documento de usuario existe?', userDoc.exists())
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUser({
              id: fbUser.uid,
              email: userData.email || fbUser.email || '',
              name: userData.name || fbUser.displayName || 'Usuario',
              avatar: userData.avatar || 'U',
              department: userData.department || 'general',
              role: userData.role || 'operativo',
              isActive: userData.isActive ?? true,
            })

            // Actualizar último login (sin await para no bloquear)
            updateDoc(doc(db, 'users', fbUser.uid), {
              lastLogin: serverTimestamp(),
            }).catch(err => console.error('Error actualizando lastLogin:', err))

            console.log('AuthProvider: Usuario cargado, redirigiendo a dashboard')
            setLoading(false)
            
            if (pathname === '/auth' || pathname === '/') {
              router.push('/dashboard')
            }
          } else {
            // Usuario autenticado pero sin documento en Firestore
            // Esto puede pasar si el registro falló a medias
            console.log('AuthProvider: Usuario sin documento, creando uno básico')
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || 'Usuario',
              avatar: (fbUser.displayName || 'U').slice(0, 2).toUpperCase(),
              department: 'general',
              role: 'operativo',
              isActive: true,
            })
            setLoading(false)
            
            if (pathname === '/auth' || pathname === '/') {
              router.push('/dashboard')
            }
          }
        } catch (error) {
          console.error('AuthProvider: Error cargando datos de usuario:', error)
          // Aún así dejamos entrar al usuario con datos básicos
          setUser({
            id: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'Usuario',
            avatar: 'U',
            department: 'general',
            role: 'operativo',
            isActive: true,
          })
          setLoading(false)
          
          if (pathname === '/auth' || pathname === '/') {
            router.push('/dashboard')
          }
        }
      } else {
        console.log('AuthProvider: Sin usuario, limpiando estado')
        setUser(null)
        setFirebaseUser(null)
        setLoading(false)
        
        if (pathname !== '/auth') {
          router.push('/auth')
        }
      }
    })

    return () => unsubscribe()
  }, [pathname, router])

  const logout = async () => {
    console.log('AuthProvider: Cerrando sesión')
    await signOut(auth)
    setUser(null)
    setFirebaseUser(null)
    router.push('/auth')
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}