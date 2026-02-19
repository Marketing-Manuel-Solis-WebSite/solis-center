/**
 * ============================================================================
 * SOLIS OS — CUSTOM HOOKS
 * ============================================================================
 * Hooks reutilizables que encapsulan lógica compleja:
 *   - useAuth: autenticación y sesión
 *   - useHierarchy: suscripción al árbol de navegación
 *   - useListTasks: suscripción a tareas de una lista
 *   - useKeyboard: atajos de teclado globales
 *   - useDebounce: debounce genérico
 *   - useOnClickOutside: detectar clicks fuera de un elemento
 * ============================================================================
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAppStore } from '../stores/useAppStore'
import { hierarchyService, taskService, userService, notificationService } from '../lib/firestore-service'
import type { IUser, UserRef } from '../types/schema'

// ======================== useAuth ========================

export function useAuth() {
  const setCurrentUser = useAppStore(s => s.setCurrentUser)
  const currentUser = useAppStore(s => s.currentUser)
  const [loading, setLoading] = useState(true)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)

      if (user) {
        // Suscribirse a datos del usuario en Firestore
        const unsubUser = userService.subscribeToUser(user.uid, (userData: IUser) => {
          setCurrentUser(userData)
          setLoading(false)
        })

        // Registrar login
        await userService.recordLogin(user.uid)

        return () => unsubUser()
      } else {
        setCurrentUser(null as unknown as IUser)
        setLoading(false)
      }
    })

    return () => unsubAuth()
  }, [setCurrentUser])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    setCurrentUser(null as unknown as IUser)
  }, [setCurrentUser])

  const userRef: UserRef | null = currentUser ? {
    id: currentUser.id,
    name: currentUser.displayName,
    avatar: currentUser.avatar || currentUser.displayName.charAt(0).toUpperCase(),
  } : null

  return {
    user: currentUser,
    firebaseUser,
    userRef,
    loading,
    isAuthenticated: !!firebaseUser,
    signOut,
  }
}

// ======================== useHierarchy ========================

export function useHierarchy(workspaceId: string | null) {
  const loading = useAppStore(s => s.hierarchyLoading)

  useEffect(() => {
    if (!workspaceId) return

    const unsubscribers = hierarchyService.subscribeToHierarchy(workspaceId)

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [workspaceId])

  return { loading }
}

// ======================== useListTasks ========================

export function useListTasks(listId: string | null) {
  const tasksLoading = useAppStore(s => s.tasksLoading)

  useEffect(() => {
    if (!listId) return

    const unsub = taskService.subscribeToListTasks(listId)

    return () => unsub()
  }, [listId])

  return { loading: tasksLoading }
}

// ======================== useNotifications ========================

export function useNotifications(userId: string | null) {
  const notifications = useAppStore(s => s.notifications)
  const unreadCount = useAppStore(s => s.unreadNotificationCount)

  useEffect(() => {
    if (!userId) return

    const unsub = notificationService.subscribeToNotifications(userId)
    return () => unsub()
  }, [userId])

  return { notifications, unreadCount }
}

// ======================== useKeyboard ========================

type KeyHandler = (e: KeyboardEvent) => void
type KeyMap = Record<string, KeyHandler>

export function useKeyboard(keyMap: KeyMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Construir la key string: "ctrl+k", "meta+shift+p", etc.
      const parts: string[] = []
      if (e.ctrlKey || e.metaKey) parts.push('ctrl')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey) parts.push('alt')
      parts.push(e.key.toLowerCase())

      const combo = parts.join('+')

      if (keyMap[combo]) {
        e.preventDefault()
        e.stopPropagation()
        keyMap[combo](e)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keyMap])
}

// ======================== useDebounce ========================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ======================== useOnClickOutside ========================

export function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

// ======================== useLocalStorage ========================

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStored(prev => {
      const next = value instanceof Function ? value(prev) : value
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(next))
      }
      return next
    })
  }, [key])

  return [stored, setValue]
}

// ======================== useMediaQuery ========================

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

// ======================== useAutoSave ========================

export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delay: number = 2000,
) {
  const debouncedData = useDebounce(data, delay)
  const isFirstRender = useRef(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    let cancelled = false

    const save = async () => {
      setSaving(true)
      try {
        await saveFn(debouncedData)
      } catch (err) {
        console.error('[AutoSave] Error:', err)
      } finally {
        if (!cancelled) setSaving(false)
      }
    }

    save()
    return () => { cancelled = true }
  }, [debouncedData, saveFn])

  return { saving }
}

// ======================== EXPORTS ========================

export default {
  useAuth,
  useHierarchy,
  useListTasks,
  useNotifications,
  useKeyboard,
  useDebounce,
  useOnClickOutside,
  useLocalStorage,
  useMediaQuery,
  useAutoSave,
}
