'use client'

import { useCallback } from 'react'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useTaskStore, useAuthStore } from '../stores'
import type { Task, TaskStatus, TaskPriority, Department } from '../types'
import { generateId } from '../lib/utils'

export function useTasks(listId?: string) {
  const { tasks, setTasks, addTask, updateTask, deleteTask, setLoading, setError } = useTaskStore()
  const { user } = useAuthStore()

  // Suscribirse a tareas en tiempo real
  const subscribeTasks = useCallback((listIdParam: string) => {
    setLoading(true)
    
    const q = query(
      collection(db, 'tasks'),
      where('listId', '==', listIdParam),
      orderBy('order', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[]
        setTasks(tasksData)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching tasks:', error)
        setError(error.message)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [setTasks, setLoading, setError])

  // Crear nueva tarea
  const createTask = useCallback(
    async (data: {
      title: string
      description?: string
      priority?: TaskPriority
      department: Department
      spaceId: string
      listId: string
      folderId?: string
      dueDate?: Date
    }) => {
      if (!user) throw new Error('Usuario no autenticado')

      const newTask: Omit<Task, 'id'> = {
        title: data.title,
        description: data.description || '',
        status: 'to_do',
        priority: data.priority || 'normal',
        assignees: [],
        createdBy: { id: user.id, name: user.name, avatar: user.avatar },
        dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
        timeEstimate: 0,
        timeTracked: 0,
        dependencies: [],
        customFields: [],
        department: data.department,
        spaceId: data.spaceId,
        folderId: data.folderId,
        listId: data.listId,
        order: tasks.length,
        attachments: [],
        comments: [],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      }

      const docRef = await addDoc(collection(db, 'tasks'), newTask)
      addTask({ id: docRef.id, ...newTask } as Task)
      
      return docRef.id
    },
    [user, tasks.length, addTask]
  )

  // Actualizar tarea
  const editTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      })
      updateTask(taskId, updates)
    },
    [updateTask]
  )

  // Mover tarea (cambiar status)
  const moveTaskStatus = useCallback(
    async (taskId: string, newStatus: TaskStatus, newOrder: number) => {
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, {
        status: newStatus,
        order: newOrder,
        updatedAt: serverTimestamp(),
      })
      updateTask(taskId, { status: newStatus, order: newOrder })
    },
    [updateTask]
  )

  // Eliminar tarea
  const removeTask = useCallback(
    async (taskId: string) => {
      const taskRef = doc(db, 'tasks', taskId)
      await deleteDoc(taskRef)
      deleteTask(taskId)
    },
    [deleteTask]
  )

  // Filtrar tareas por status
  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  )

  return {
    tasks,
    subscribeTasks,
    createTask,
    editTask,
    moveTaskStatus,
    removeTask,
    getTasksByStatus,
  }
}
