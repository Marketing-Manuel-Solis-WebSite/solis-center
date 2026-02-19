/**
 * ============================================================================
 * SOLIS OS — CAPA DE SERVICIOS FIRESTORE
 * ============================================================================
 * Abstracción completa sobre Firestore. Ningún componente debería importar
 * directamente desde 'firebase/firestore'. Todo pasa por aquí.
 *
 * Características:
 *   - Operaciones atómicas con batched writes.
 *   - Suscripciones en tiempo real con cleanup automático.
 *   - Integración con el store optimista (Zustand).
 *   - Manejo de errores centralizado.
 * ============================================================================
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  DocumentReference,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { useAppStore } from '../stores/useAppStore'
import type {
  ITask,
  ISpace,
  IFolder,
  IList,
  IUser,
  IActivityEntry,
  ActivityAction,
  StatusConfig,
  UserRef,
  TaskPriority,
  HierarchyPath,
  ISubtask,
  IComment,
  IAttachment,
  TaskCustomFieldEntry,
  INotification,
  NotificationType,
} from '../types/schema'

// ======================== CONSTANTES ========================

const COLLECTIONS = {
  USERS: 'users',
  WORKSPACES: 'workspaces',
  SPACES: 'spaces',
  FOLDERS: 'folders',
  LISTS: 'lists',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  FORMS: 'forms',
  FORM_SUBMISSIONS: 'form_submissions',
  SOCIAL_MESSAGES: 'social_messages',
  SOCIAL_THREADS: 'social_threads',
  DIRECT_CHATS: 'direct_chats',
  GROUP_CHATS: 'group_chats',
  CHAT_MESSAGES: 'chat_messages',
  DOCUMENTS: 'documents',
  ACTIVITY_LOG: 'activity_log',
} as const

// ======================== HELPER: REF RÁPIDA ========================

const colRef = (name: string) => collection(db, name)
const docRef = (name: string, id: string) => doc(db, name, id)

// ======================== HELPER: LOG DE ACTIVIDAD ========================

function createActivityEntry(
  action: ActivityAction,
  user: UserRef,
  field?: string,
  oldValue?: string,
  newValue?: string,
): IActivityEntry {
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action,
    userId: user.id,
    userName: user.name,
    timestamp: Date.now(),
    field,
    oldValue,
    newValue,
  }
}

// ======================== SERVICIO DE JERARQUÍA ========================

export const hierarchyService = {
  /**
   * Carga todo el árbol de navegación de un workspace en una sola operación.
   * Retorna unsub para limpiar suscripciones.
   */
  subscribeToHierarchy(workspaceId: string): Unsubscribe[] {
    const store = useAppStore.getState()
    const unsubscribers: Unsubscribe[] = []

    store.setHierarchyLoading(true)

    // Suscribir Spaces
    const spacesQuery = query(
      colRef(COLLECTIONS.SPACES),
      where('workspaceId', '==', workspaceId),
      orderBy('order', 'asc')
    )
    unsubscribers.push(
      onSnapshot(spacesQuery, (snap) => {
        const spaces = snap.docs.map(d => ({ id: d.id, ...d.data() } as ISpace))
        store.setSpaces(spaces)
      })
    )

    // Suscribir Folders
    const foldersQuery = query(
      colRef(COLLECTIONS.FOLDERS),
      where('workspaceId', '==', workspaceId),
      orderBy('order', 'asc')
    )
    unsubscribers.push(
      onSnapshot(foldersQuery, (snap) => {
        const folders = snap.docs.map(d => ({ id: d.id, ...d.data() } as IFolder))
        store.setFolders(folders)
      })
    )

    // Suscribir Lists
    const listsQuery = query(
      colRef(COLLECTIONS.LISTS),
      where('workspaceId', '==', workspaceId),
      orderBy('order', 'asc')
    )
    unsubscribers.push(
      onSnapshot(listsQuery, (snap) => {
        const lists = snap.docs.map(d => ({ id: d.id, ...d.data() } as IList))
        store.setLists(lists)
        store.setHierarchyLoading(false)
      })
    )

    return unsubscribers
  },

  /** Crear un nuevo Space */
  async createSpace(data: Omit<ISpace, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const ref = await addDoc(colRef(COLLECTIONS.SPACES), docData)
    return ref.id
  },

  /** Crear un nuevo Folder */
  async createFolder(data: Omit<IFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const ref = await addDoc(colRef(COLLECTIONS.FOLDERS), docData)
    return ref.id
  },

  /** Crear una nueva List */
  async createList(data: Omit<IList, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const ref = await addDoc(colRef(COLLECTIONS.LISTS), docData)
    return ref.id
  },

  /** Eliminar un Space y todo su contenido (cascada) */
  async deleteSpaceCascade(spaceId: string): Promise<void> {
    const batch = writeBatch(db)

    // Obtener todas las listas del Space
    const listsSnap = await getDocs(
      query(colRef(COLLECTIONS.LISTS), where('spaceId', '==', spaceId))
    )

    // Obtener todos los folders del Space
    const foldersSnap = await getDocs(
      query(colRef(COLLECTIONS.FOLDERS), where('spaceId', '==', spaceId))
    )

    // Obtener todas las tareas de las listas
    for (const listDoc of listsSnap.docs) {
      const tasksSnap = await getDocs(
        query(colRef(COLLECTIONS.TASKS), where('listId', '==', listDoc.id))
      )
      for (const taskDoc of tasksSnap.docs) {
        batch.delete(taskDoc.ref)
      }
      batch.delete(listDoc.ref)
    }

    // Eliminar folders
    for (const folderDoc of foldersSnap.docs) {
      batch.delete(folderDoc.ref)
    }

    // Eliminar el space
    batch.delete(docRef(COLLECTIONS.SPACES, spaceId))

    await batch.commit()
  },

  /** Reordenar spaces/folders/lists */
  async reorder(
    collection_name: 'spaces' | 'folders' | 'lists',
    items: Array<{ id: string; order: number }>
  ): Promise<void> {
    const batch = writeBatch(db)
    for (const item of items) {
      batch.update(docRef(collection_name, item.id), { order: item.order })
    }
    await batch.commit()
  },
}

// ======================== SERVICIO DE TAREAS ========================

export const taskService = {
  /**
   * Suscribirse a tareas de una lista en tiempo real.
   * Sincroniza automáticamente con el store.
   */
  subscribeToListTasks(listId: string): Unsubscribe {
    const store = useAppStore.getState()
    store.setTasksLoading(true)

    const q = query(
      colRef(COLLECTIONS.TASKS),
      where('listId', '==', listId),
      where('isArchived', '==', false),
      orderBy('order', 'asc')
    )

    return onSnapshot(q, (snap) => {
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as ITask))
      // Hacemos batch upsert para no perder tareas de otras listas
      store.batchUpsertTasks(tasks)
      store.setTasksLoading(false)
    }, (error) => {
      console.error('[TaskService] Error suscribiendo a tareas:', error)
      store.setTaskError(error.message)
      store.setTasksLoading(false)
    })
  },

  /**
   * Suscribirse a TODAS las tareas asignadas a un usuario.
   * Útil para la vista "Mis Tareas".
   */
  subscribeToUserTasks(userId: string): Unsubscribe {
    const store = useAppStore.getState()

    const q = query(
      colRef(COLLECTIONS.TASKS),
      where('assignees', 'array-contains', { id: userId }),
      where('isArchived', '==', false),
      orderBy('updatedAt', 'desc'),
      limit(200)
    )

    return onSnapshot(q, (snap) => {
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as ITask))
      store.batchUpsertTasks(tasks)
    })
  },

  /** Crear una nueva tarea con Optimistic UI */
  async createTask(
    data: Omit<ITask, 'id' | 'createdAt' | 'updatedAt' | 'activityLog' | 'commentCount' | 'subtaskCount' | 'subtasksDone'>,
    currentUser: UserRef
  ): Promise<string> {
    const store = useAppStore.getState()

    // Generar ID temporal para optimistic update
    const tempId = `temp_${Date.now()}`
    const now = Date.now()

    const optimisticTask: ITask = {
      ...data,
      id: tempId,
      activityLog: [createActivityEntry('created', currentUser)],
      commentCount: 0,
      subtaskCount: data.subtasks?.length || 0,
      subtasksDone: 0,
      createdAt: Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
    }

    // Optimistic: agregar al store inmediatamente
    store.upsertTask(optimisticTask)

    try {
      // Persistir en Firestore
      const docData = {
        ...data,
        activityLog: optimisticTask.activityLog,
        commentCount: 0,
        subtaskCount: data.subtasks?.length || 0,
        subtasksDone: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const ref = await addDoc(colRef(COLLECTIONS.TASKS), docData)

      // Actualizar counter en la lista
      await updateDoc(docRef(COLLECTIONS.LISTS, data.listId), {
        taskCount: increment(1),
      })

      // Reemplazar tarea temporal con la real
      store.removeTask(tempId)
      store.upsertTask({ ...optimisticTask, id: ref.id })

      return ref.id
    } catch (error) {
      // Rollback: remover tarea temporal
      store.removeTask(tempId)
      store.addToast({
        type: 'error',
        title: 'Error al crear tarea',
        description: (error as Error).message,
      })
      throw error
    }
  },

  /** Actualizar tarea con Optimistic UI y log de actividad */
  async updateTask(
    taskId: string,
    updates: Partial<ITask>,
    currentUser: UserRef,
    activityAction?: ActivityAction,
    activityField?: string,
    oldValue?: string,
    newValue?: string,
  ): Promise<void> {
    const store = useAppStore.getState()
    const { rollback } = store.optimisticUpdateTask(taskId, updates)

    try {
      const docUpdates: Record<string, any> = {
        ...updates,
        updatedAt: serverTimestamp(),
      }

      // Agregar entrada al log de actividad
      if (activityAction) {
        const entry = createActivityEntry(activityAction, currentUser, activityField, oldValue, newValue)
        docUpdates.activityLog = arrayUnion(entry)
      }

      await updateDoc(docRef(COLLECTIONS.TASKS, taskId), docUpdates)
    } catch (error) {
      rollback?.()
      store.addToast({
        type: 'error',
        title: 'Error al actualizar tarea',
        description: (error as Error).message,
      })
      throw error
    }
  },

  /** Mover tarea a otra lista (operación atómica) */
  async moveTask(
    taskId: string,
    sourceListId: string,
    targetListId: string,
    newStatus: string,
    newOrder: number,
    currentUser: UserRef,
  ): Promise<void> {
    const store = useAppStore.getState()
    const task = store.getTaskById(taskId)
    if (!task) throw new Error('Tarea no encontrada')

    // Optimistic update
    const { rollback } = store.optimisticMoveTask(taskId, targetListId, newStatus, newOrder)

    try {
      const batch = writeBatch(db)
      const taskRef = docRef(COLLECTIONS.TASKS, taskId)

      // Actualizar tarea
      batch.update(taskRef, {
        listId: targetListId,
        status: newStatus,
        order: newOrder,
        'path.listId': targetListId,
        updatedAt: serverTimestamp(),
        activityLog: arrayUnion(
          createActivityEntry('moved', currentUser, 'list', sourceListId, targetListId)
        ),
      })

      // Actualizar contadores de listas
      if (sourceListId !== targetListId) {
        batch.update(docRef(COLLECTIONS.LISTS, sourceListId), {
          taskCount: increment(-1),
        })
        batch.update(docRef(COLLECTIONS.LISTS, targetListId), {
          taskCount: increment(1),
        })
      }

      await batch.commit()
    } catch (error) {
      rollback?.()
      store.addToast({
        type: 'error',
        title: 'Error al mover tarea',
        description: (error as Error).message,
      })
      throw error
    }
  },

  /** Cambiar status de tarea (drag & drop en Kanban) */
  async changeStatus(
    taskId: string,
    newStatus: string,
    currentUser: UserRef,
  ): Promise<void> {
    const store = useAppStore.getState()
    const task = store.getTaskById(taskId)
    if (!task) throw new Error('Tarea no encontrada')

    const oldStatus = task.status
    const isCompleting = newStatus === 'done' && oldStatus !== 'done'

    const updates: Partial<ITask> = {
      status: newStatus,
      ...(isCompleting && { completedAt: Timestamp.now() }),
    }

    await this.updateTask(
      taskId,
      updates,
      currentUser,
      'status_changed',
      'status',
      oldStatus,
      newStatus,
    )
  },

  /** Asignar usuarios a tarea */
  async assignUsers(
    taskId: string,
    assignees: UserRef[],
    currentUser: UserRef,
  ): Promise<void> {
    await this.updateTask(
      taskId,
      { assignees },
      currentUser,
      'assigned',
      'assignees',
      undefined,
      assignees.map(a => a.name).join(', '),
    )
  },

  /** Eliminar tarea con Optimistic UI */
  async deleteTask(taskId: string): Promise<void> {
    const store = useAppStore.getState()
    const task = store.getTaskById(taskId)
    if (!task) return

    const { rollback } = store.optimisticDeleteTask(taskId)

    try {
      const batch = writeBatch(db)
      batch.delete(docRef(COLLECTIONS.TASKS, taskId))
      batch.update(docRef(COLLECTIONS.LISTS, task.listId), {
        taskCount: increment(-1),
      })
      await batch.commit()
    } catch (error) {
      rollback?.()
      store.addToast({
        type: 'error',
        title: 'Error al eliminar tarea',
        description: (error as Error).message,
      })
      throw error
    }
  },

  /** Archivar tarea (soft delete) */
  async archiveTask(taskId: string, currentUser: UserRef): Promise<void> {
    await this.updateTask(
      taskId,
      { isArchived: true, archivedAt: Timestamp.now() as any },
      currentUser,
      'archived',
    )
  },

  /** Agregar subtarea */
  async addSubtask(taskId: string, subtask: ISubtask): Promise<void> {
    await updateDoc(docRef(COLLECTIONS.TASKS, taskId), {
      subtasks: arrayUnion(subtask),
      subtaskCount: increment(1),
      updatedAt: serverTimestamp(),
    })
  },

  /** Completar subtarea */
  async toggleSubtask(taskId: string, subtaskId: string, completed: boolean): Promise<void> {
    const store = useAppStore.getState()
    const task = store.getTaskById(taskId)
    if (!task) return

    const updatedSubtasks = task.subtasks.map(s =>
      s.id === subtaskId
        ? { ...s, completed, completedAt: completed ? Date.now() : undefined }
        : s
    )

    await updateDoc(docRef(COLLECTIONS.TASKS, taskId), {
      subtasks: updatedSubtasks,
      subtasksDone: increment(completed ? 1 : -1),
      updatedAt: serverTimestamp(),
    })
  },

  /** Agregar comentario */
  async addComment(taskId: string, comment: Omit<IComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const fullComment: IComment = {
      ...comment,
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    await updateDoc(docRef(COLLECTIONS.TASKS, taskId), {
      comments: arrayUnion(fullComment),
      commentCount: increment(1),
      updatedAt: serverTimestamp(),
    })
  },

  /** Reordenar tareas dentro de una columna/lista */
  async reorderTasks(tasks: Array<{ id: string; order: number; status?: string }>): Promise<void> {
    const batch = writeBatch(db)

    for (const task of tasks) {
      const updates: Record<string, any> = { order: task.order }
      if (task.status) updates.status = task.status
      batch.update(docRef(COLLECTIONS.TASKS, task.id), updates)
    }

    await batch.commit()
  },
}

// ======================== SERVICIO DE USUARIOS ========================

export const userService = {
  /** Obtener usuario por ID */
  async getUser(userId: string): Promise<IUser | null> {
    const snap = await getDoc(docRef(COLLECTIONS.USERS, userId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as IUser
  },

  /** Suscribirse a datos del usuario actual */
  subscribeToUser(userId: string, callback: (user: IUser) => void): Unsubscribe {
    return onSnapshot(docRef(COLLECTIONS.USERS, userId), (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as IUser)
      }
    })
  },

  /** Suscribirse a todos los usuarios del workspace */
  subscribeToUsers(callback: (users: IUser[]) => void): Unsubscribe {
    const q = query(colRef(COLLECTIONS.USERS), where('isActive', '==', true))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as IUser)))
    })
  },

  /** Actualizar perfil de usuario */
  async updateUser(userId: string, updates: Partial<IUser>): Promise<void> {
    await updateDoc(docRef(COLLECTIONS.USERS, userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  /** Registrar último login */
  async recordLogin(userId: string): Promise<void> {
    await updateDoc(docRef(COLLECTIONS.USERS, userId), {
      lastLoginAt: serverTimestamp(),
      onlineStatus: 'online',
    })
  },
}

// ======================== SERVICIO DE NOTIFICACIONES ========================

export const notificationService = {
  /** Suscribirse a notificaciones del usuario */
  subscribeToNotifications(userId: string): Unsubscribe {
    const store = useAppStore.getState()

    const q = query(
      colRef(COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    return onSnapshot(q, (snap) => {
      const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() } as INotification))
      store.setNotifications(notifications)
    })
  },

  /** Crear notificación */
  async create(data: Omit<INotification, 'id' | 'createdAt'>): Promise<void> {
    await addDoc(colRef(COLLECTIONS.NOTIFICATIONS), {
      ...data,
      createdAt: serverTimestamp(),
    })
  },

  /** Marcar como leída */
  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(docRef(COLLECTIONS.NOTIFICATIONS, notificationId), {
      isRead: true,
      readAt: serverTimestamp(),
    })
  },

  /** Notificar asignación de tarea */
  async notifyTaskAssignment(
    task: { id: string; title: string },
    assigneeId: string,
    actor: UserRef,
  ): Promise<void> {
    await this.create({
      userId: assigneeId,
      type: 'task_assigned',
      title: 'Nueva tarea asignada',
      body: `${actor.name} te asignó: "${task.title}"`,
      taskId: task.id,
      taskTitle: task.title,
      actorId: actor.id,
      actorName: actor.name,
      actorAvatar: actor.avatar,
      isRead: false,
      actionUrl: `/task/${task.id}`,
    })
  },
}

// ======================== EXPORT CENTRALIZADO ========================

export const firestoreService = {
  hierarchy: hierarchyService,
  tasks: taskService,
  users: userService,
  notifications: notificationService,
  COLLECTIONS,
}

export default firestoreService
