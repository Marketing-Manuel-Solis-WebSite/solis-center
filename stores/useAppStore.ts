/**
 * ============================================================================
 * SOLIS OS — STORE GLOBAL (Zustand con Slices)
 * ============================================================================
 * Motor reactivo de la aplicación. Maneja:
 *   1. TaskSlice     — CRUD optimista de tareas con rollback automático.
 *   2. HierarchySlice — Árbol de navegación (Spaces/Folders/Lists).
 *   3. UISlice       — Estado de la interfaz (sidebar, modales, paneles).
 *   4. AuthSlice     — Usuario actual y permisos.
 *   5. ChatSlice     — Estado de mensajería interna.
 *   6. NoraSlice     — Estado del agente de IA.
 *
 * Principios:
 *   - Optimistic UI: cambios se reflejan en 0ms, rollback si Firestore falla.
 *   - Selectores granulares: cada componente solo re-renderiza lo que necesita.
 *   - Inmutabilidad implícita: Zustand maneja esto internamente con Immer.
 * ============================================================================
 */

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  ITask,
  ISpace,
  IFolder,
  IList,
  IUser,
  IView,
  INotification,
  ViewType,
  ViewFilter,
  ViewSortConfig,
  TaskPriority,
  StatusConfig,
  UserRef,
  NoraInsight,
  HierarchyPath,
  Department,
  UserRole,
  UserPermissions,
} from '../types/schema'

// ======================== TIPOS AUXILIARES ========================

/** Resultado de una operación optimista con posibilidad de rollback */
interface OptimisticResult<T = void> {
  success: boolean
  data?: T
  error?: string
  rollback?: () => void
}

/** Configuración de filtros activos en la vista actual */
interface ActiveFilters {
  search: string
  status: string         // 'all' o un statusId
  priority: string       // 'all' o TaskPriority
  assignee: string       // 'all', 'unassigned', o userId
  department: string     // 'all' o Department
  tags: string[]
  dateRange?: { start: string; end: string }
}

// ======================== TASK SLICE ========================

interface TaskSlice {
  // Estado
  tasks: Record<string, ITask>        // Mapa indexado por ID para O(1) lookup
  taskIds: string[]                    // Orden de IDs para iteración
  selectedTaskId: string | null
  isLoadingTasks: boolean
  taskError: string | null

  // Caché de tareas por lista (evita filtrar en cada render)
  tasksByList: Record<string, string[]>  // listId → taskIds[]

  // Acciones
  setTasks: (tasks: ITask[]) => void
  upsertTask: (task: ITask) => void
  removeTask: (taskId: string) => void
  batchUpsertTasks: (tasks: ITask[]) => void
  selectTask: (taskId: string | null) => void
  setTasksLoading: (loading: boolean) => void
  setTaskError: (error: string | null) => void

  // Operaciones optimistas
  optimisticUpdateTask: (taskId: string, updates: Partial<ITask>) => OptimisticResult
  optimisticMoveTask: (
    taskId: string,
    targetListId: string,
    newStatus: string,
    newOrder: number
  ) => OptimisticResult
  optimisticDeleteTask: (taskId: string) => OptimisticResult

  // Selectores computados (funciones puras)
  getTaskById: (taskId: string) => ITask | undefined
  getTasksByListId: (listId: string) => ITask[]
  getTasksByStatus: (listId: string, statusId: string) => ITask[]
  getFilteredTasks: (listId: string, filters: ActiveFilters) => ITask[]
  getTasksByAssignee: (userId: string) => ITask[]
  getOverdueTasks: () => ITask[]
  getTaskStats: (listId?: string) => {
    total: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    overdue: number
    completedToday: number
  }
}

// ======================== HIERARCHY SLICE ========================

interface HierarchySlice {
  // Estado
  spaces: Record<string, ISpace>
  folders: Record<string, IFolder>
  lists: Record<string, IList>
  isLoadingHierarchy: boolean

  // Navegación activa
  activeWorkspaceId: string | null
  activeSpaceId: string | null
  activeFolderId: string | null
  activeListId: string | null

  // Acciones
  setSpaces: (spaces: ISpace[]) => void
  setFolders: (folders: IFolder[]) => void
  setLists: (lists: IList[]) => void
  upsertSpace: (space: ISpace) => void
  upsertFolder: (folder: IFolder) => void
  upsertList: (list: IList) => void
  removeSpace: (spaceId: string) => void
  removeFolder: (folderId: string) => void
  removeList: (listId: string) => void

  // Navegación
  navigateTo: (path: Partial<HierarchyPath>) => void
  setActiveWorkspace: (id: string | null) => void
  setActiveSpace: (id: string | null) => void
  setActiveFolder: (id: string | null) => void
  setActiveList: (id: string | null) => void
  setHierarchyLoading: (loading: boolean) => void

  // Selectores
  getSpaceById: (id: string) => ISpace | undefined
  getFolderById: (id: string) => IFolder | undefined
  getListById: (id: string) => IList | undefined
  getSpacesByWorkspace: (workspaceId: string) => ISpace[]
  getFoldersBySpace: (spaceId: string) => IFolder[]
  getListsBySpace: (spaceId: string) => IList[]
  getListsByFolder: (folderId: string) => IList[]
  getDirectListsBySpace: (spaceId: string) => IList[]  // Listas sin folder
  getSidebarTree: () => SidebarNode[]
}

/** Nodo del árbol de navegación del sidebar */
export interface SidebarNode {
  id: string
  type: 'space' | 'folder' | 'list'
  name: string
  icon?: string
  color?: string
  department?: Department
  children: SidebarNode[]
  order: number
  taskCount?: number
}

// ======================== UI SLICE ========================

interface UISlice {
  // Layout
  sidebarCollapsed: boolean
  sidebarWidth: number
  rightPanelOpen: boolean
  rightPanelContent: 'task_detail' | 'nora' | 'notifications' | 'chat' | null

  // Vista actual
  currentViewType: ViewType
  currentViewId: string | null
  activeFilters: ActiveFilters

  // Modales
  modals: {
    createTask: boolean
    createSpace: boolean
    createList: boolean
    createReport: boolean
    createForm: boolean
    editTask: string | null      // taskId o null
    confirmDelete: string | null // entityId o null
    userProfile: boolean
    adminUsers: boolean
    settings: boolean
    commandPalette: boolean      // Cmd+K
  }

  // Global
  globalSearch: string
  theme: 'dark' | 'light' | 'system'
  toasts: Toast[]

  // Acciones
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setRightPanel: (content: UISlice['rightPanelContent']) => void
  toggleRightPanel: () => void
  setCurrentView: (type: ViewType, viewId?: string) => void
  setActiveFilters: (filters: Partial<ActiveFilters>) => void
  resetFilters: () => void
  openModal: (modal: keyof UISlice['modals'], payload?: string) => void
  closeModal: (modal: keyof UISlice['modals']) => void
  closeAllModals: () => void
  setGlobalSearch: (search: string) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setTheme: (theme: UISlice['theme']) => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number  // ms, default 4000
  action?: {
    label: string
    onClick: () => void
  }
}

// ======================== AUTH SLICE ========================

interface AuthSlice {
  user: IUser | null
  isAuthenticated: boolean
  isAuthLoading: boolean

  setUser: (user: IUser | null) => void
  setAuthLoading: (loading: boolean) => void
  logout: () => void

  // Helpers de permisos
  hasPermission: (permission: keyof UserPermissions) => boolean
  isAtLeastRole: (minimumRole: UserRole) => boolean
  canAccessDepartment: (department: Department) => boolean
}

/** Jerarquía de roles para comparación */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 100,
  director: 90,
  gerente: 80,
  supervisor: 70,
  lider: 60,
  operativo: 50,
  invitado: 10,
}

// ======================== NORA SLICE ========================

interface NoraSlice {
  isNoraOpen: boolean
  isNoraThinking: boolean
  noraConversation: NoraMessage[]
  noraInsights: NoraInsight[]
  unreadInsights: number

  toggleNora: () => void
  setNoraThinking: (thinking: boolean) => void
  addNoraMessage: (message: NoraMessage) => void
  clearNoraConversation: () => void
  setNoraInsights: (insights: NoraInsight[]) => void
  acknowledgeInsight: (insightId: string) => void
}

export interface NoraMessage {
  id: string
  role: 'user' | 'nora' | 'system'
  content: string
  timestamp: number
  actions?: Array<{
    label: string
    type: string
    executed: boolean
  }>
}

// ======================== NOTIFICATION SLICE ========================

interface NotificationSlice {
  notifications: INotification[]
  unreadCount: number

  setNotifications: (notifications: INotification[]) => void
  addNotification: (notification: INotification) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  removeNotification: (notificationId: string) => void
}

// ======================== STORE COMPLETO ========================

export type AppStore = TaskSlice & HierarchySlice & UISlice & AuthSlice & NoraSlice & NotificationSlice

// ======================== FILTROS DEFAULT ========================

const DEFAULT_FILTERS: ActiveFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  assignee: 'all',
  department: 'all',
  tags: [],
}

// ======================== IMPLEMENTACIÓN ========================

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      // NOTA: Immer requiere instalación: `npm i immer zustand`
      // Si no está disponible, usaremos spread operators directamente
      (set, get) => ({

        // ==================== TASK SLICE ====================

        tasks: {},
        taskIds: [],
        selectedTaskId: null,
        isLoadingTasks: false,
        taskError: null,
        tasksByList: {},

        setTasks: (tasks) => set((state) => {
          const taskMap: Record<string, ITask> = {}
          const ids: string[] = []
          const byList: Record<string, string[]> = {}

          for (const task of tasks) {
            taskMap[task.id] = task
            ids.push(task.id)

            if (!byList[task.listId]) byList[task.listId] = []
            byList[task.listId].push(task.id)
          }

          return { tasks: taskMap, taskIds: ids, tasksByList: byList }
        }),

        upsertTask: (task) => set((state) => {
          const isNew = !state.tasks[task.id]
          const newTasks = { ...state.tasks, [task.id]: task }
          const newIds = isNew ? [...state.taskIds, task.id] : state.taskIds

          // Actualizar índice por lista
          const newByList = { ...state.tasksByList }
          if (!newByList[task.listId]) newByList[task.listId] = []
          if (!newByList[task.listId].includes(task.id)) {
            newByList[task.listId] = [...newByList[task.listId], task.id]
          }

          return { tasks: newTasks, taskIds: newIds, tasksByList: newByList }
        }),

        removeTask: (taskId) => set((state) => {
          const task = state.tasks[taskId]
          if (!task) return state

          const { [taskId]: _, ...remainingTasks } = state.tasks
          const newIds = state.taskIds.filter(id => id !== taskId)
          const newByList = { ...state.tasksByList }

          if (newByList[task.listId]) {
            newByList[task.listId] = newByList[task.listId].filter(id => id !== taskId)
          }

          return {
            tasks: remainingTasks,
            taskIds: newIds,
            tasksByList: newByList,
            selectedTaskId: state.selectedTaskId === taskId ? null : state.selectedTaskId,
          }
        }),

        batchUpsertTasks: (tasks) => set((state) => {
          const newTasks = { ...state.tasks }
          const newIds = [...state.taskIds]
          const newByList = { ...state.tasksByList }

          for (const task of tasks) {
            const isNew = !newTasks[task.id]
            newTasks[task.id] = task

            if (isNew) newIds.push(task.id)

            if (!newByList[task.listId]) newByList[task.listId] = []
            if (!newByList[task.listId].includes(task.id)) {
              newByList[task.listId] = [...newByList[task.listId], task.id]
            }
          }

          return { tasks: newTasks, taskIds: newIds, tasksByList: newByList }
        }),

        selectTask: (taskId) => set({ selectedTaskId: taskId }),

        setTasksLoading: (loading) => set({ isLoadingTasks: loading }),

        setTaskError: (error) => set({ taskError: error }),

        // --- Operaciones Optimistas ---

        optimisticUpdateTask: (taskId, updates) => {
          const state = get()
          const originalTask = state.tasks[taskId]
          if (!originalTask) return { success: false, error: 'Tarea no encontrada' }

          // Aplicar cambio inmediato
          const updatedTask = { ...originalTask, ...updates, updatedAt: Date.now() as any }
          set((s) => ({
            tasks: { ...s.tasks, [taskId]: updatedTask as ITask }
          }))

          // Retornar función de rollback
          return {
            success: true,
            rollback: () => {
              set((s) => ({
                tasks: { ...s.tasks, [taskId]: originalTask }
              }))
            }
          }
        },

        optimisticMoveTask: (taskId, targetListId, newStatus, newOrder) => {
          const state = get()
          const originalTask = state.tasks[taskId]
          if (!originalTask) return { success: false, error: 'Tarea no encontrada' }

          const originalListId = originalTask.listId

          // Aplicar cambio inmediato
          const movedTask: ITask = {
            ...originalTask,
            listId: targetListId,
            status: newStatus,
            order: newOrder,
            path: { ...originalTask.path, listId: targetListId },
          }

          set((s) => {
            const newTasks = { ...s.tasks, [taskId]: movedTask }
            const newByList = { ...s.tasksByList }

            // Remover de lista original
            if (newByList[originalListId]) {
              newByList[originalListId] = newByList[originalListId].filter(id => id !== taskId)
            }

            // Agregar a lista destino
            if (!newByList[targetListId]) newByList[targetListId] = []
            newByList[targetListId] = [...newByList[targetListId], taskId]

            return { tasks: newTasks, tasksByList: newByList }
          })

          return {
            success: true,
            rollback: () => {
              set((s) => {
                const newTasks = { ...s.tasks, [taskId]: originalTask }
                const newByList = { ...s.tasksByList }

                // Revertir: remover de lista destino
                if (newByList[targetListId]) {
                  newByList[targetListId] = newByList[targetListId].filter(id => id !== taskId)
                }

                // Revertir: agregar a lista original
                if (!newByList[originalListId]) newByList[originalListId] = []
                if (!newByList[originalListId].includes(taskId)) {
                  newByList[originalListId] = [...newByList[originalListId], taskId]
                }

                return { tasks: newTasks, tasksByList: newByList }
              })
            }
          }
        },

        optimisticDeleteTask: (taskId) => {
          const state = get()
          const originalTask = state.tasks[taskId]
          if (!originalTask) return { success: false, error: 'Tarea no encontrada' }

          // Remover inmediatamente
          get().removeTask(taskId)

          return {
            success: true,
            rollback: () => {
              get().upsertTask(originalTask)
            }
          }
        },

        // --- Selectores ---

        getTaskById: (taskId) => get().tasks[taskId],

        getTasksByListId: (listId) => {
          const state = get()
          const ids = state.tasksByList[listId] || []
          return ids.map(id => state.tasks[id]).filter(Boolean).sort((a, b) => a.order - b.order)
        },

        getTasksByStatus: (listId, statusId) => {
          return get().getTasksByListId(listId).filter(t => t.status === statusId)
        },

        getFilteredTasks: (listId, filters) => {
          let tasks = get().getTasksByListId(listId)

          if (filters.search) {
            const search = filters.search.toLowerCase()
            tasks = tasks.filter(t =>
              t.title.toLowerCase().includes(search) ||
              t.description.toLowerCase().includes(search)
            )
          }

          if (filters.status !== 'all') {
            tasks = tasks.filter(t => t.status === filters.status)
          }

          if (filters.priority !== 'all') {
            tasks = tasks.filter(t => t.priority === filters.priority)
          }

          if (filters.assignee !== 'all') {
            if (filters.assignee === 'unassigned') {
              tasks = tasks.filter(t => t.assignees.length === 0)
            } else {
              tasks = tasks.filter(t => t.assignees.some(a => a.id === filters.assignee))
            }
          }

          if (filters.tags.length > 0) {
            tasks = tasks.filter(t =>
              filters.tags.some(tag => t.tags.includes(tag))
            )
          }

          return tasks
        },

        getTasksByAssignee: (userId) => {
          const state = get()
          return state.taskIds
            .map(id => state.tasks[id])
            .filter(t => t && t.assignees.some(a => a.id === userId))
        },

        getOverdueTasks: () => {
          const today = new Date().toISOString().split('T')[0]
          const state = get()
          return state.taskIds
            .map(id => state.tasks[id])
            .filter(t => t && t.dueDate && t.dueDate < today && t.status !== 'done')
        },

        getTaskStats: (listId) => {
          const state = get()
          const tasks = listId
            ? state.getTasksByListId(listId)
            : state.taskIds.map(id => state.tasks[id]).filter(Boolean)

          const today = new Date().toISOString().split('T')[0]
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)

          const byStatus: Record<string, number> = {}
          const byPriority: Record<string, number> = {}
          let overdue = 0
          let completedToday = 0

          for (const task of tasks) {
            byStatus[task.status] = (byStatus[task.status] || 0) + 1
            byPriority[task.priority] = (byPriority[task.priority] || 0) + 1

            if (task.dueDate && task.dueDate < today && task.status !== 'done') {
              overdue++
            }

            if (task.completedAt) {
              const completedMs = typeof task.completedAt === 'number'
                ? task.completedAt
                : (task.completedAt as any)?.seconds * 1000 || 0
              if (completedMs >= todayStart.getTime()) {
                completedToday++
              }
            }
          }

          return {
            total: tasks.length,
            byStatus,
            byPriority,
            overdue,
            completedToday,
          }
        },

        // ==================== HIERARCHY SLICE ====================

        spaces: {},
        folders: {},
        lists: {},
        isLoadingHierarchy: false,
        activeWorkspaceId: null,
        activeSpaceId: null,
        activeFolderId: null,
        activeListId: null,

        setSpaces: (spaces) => set(() => {
          const map: Record<string, ISpace> = {}
          for (const s of spaces) map[s.id] = s
          return { spaces: map }
        }),

        setFolders: (folders) => set(() => {
          const map: Record<string, IFolder> = {}
          for (const f of folders) map[f.id] = f
          return { folders: map }
        }),

        setLists: (lists) => set(() => {
          const map: Record<string, IList> = {}
          for (const l of lists) map[l.id] = l
          return { lists: map }
        }),

        upsertSpace: (space) => set((s) => ({
          spaces: { ...s.spaces, [space.id]: space }
        })),

        upsertFolder: (folder) => set((s) => ({
          folders: { ...s.folders, [folder.id]: folder }
        })),

        upsertList: (list) => set((s) => ({
          lists: { ...s.lists, [list.id]: list }
        })),

        removeSpace: (spaceId) => set((s) => {
          const { [spaceId]: _, ...rest } = s.spaces
          return {
            spaces: rest,
            activeSpaceId: s.activeSpaceId === spaceId ? null : s.activeSpaceId,
          }
        }),

        removeFolder: (folderId) => set((s) => {
          const { [folderId]: _, ...rest } = s.folders
          return {
            folders: rest,
            activeFolderId: s.activeFolderId === folderId ? null : s.activeFolderId,
          }
        }),

        removeList: (listId) => set((s) => {
          const { [listId]: _, ...rest } = s.lists
          return {
            lists: rest,
            activeListId: s.activeListId === listId ? null : s.activeListId,
          }
        }),

        navigateTo: (path) => set({
          activeWorkspaceId: path.workspaceId ?? get().activeWorkspaceId,
          activeSpaceId: path.spaceId ?? null,
          activeFolderId: path.folderId ?? null,
          activeListId: path.listId ?? null,
        }),

        setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
        setActiveSpace: (id) => set({ activeSpaceId: id, activeFolderId: null, activeListId: null }),
        setActiveFolder: (id) => set({ activeFolderId: id, activeListId: null }),
        setActiveList: (id) => set({ activeListId: id }),
        setHierarchyLoading: (loading) => set({ isLoadingHierarchy: loading }),

        getSpaceById: (id) => get().spaces[id],
        getFolderById: (id) => get().folders[id],
        getListById: (id) => get().lists[id],

        getSpacesByWorkspace: (workspaceId) => {
          return Object.values(get().spaces)
            .filter(s => s.workspaceId === workspaceId)
            .sort((a, b) => a.order - b.order)
        },

        getFoldersBySpace: (spaceId) => {
          return Object.values(get().folders)
            .filter(f => f.spaceId === spaceId)
            .sort((a, b) => a.order - b.order)
        },

        getListsBySpace: (spaceId) => {
          return Object.values(get().lists)
            .filter(l => l.spaceId === spaceId)
            .sort((a, b) => a.order - b.order)
        },

        getListsByFolder: (folderId) => {
          return Object.values(get().lists)
            .filter(l => l.folderId === folderId)
            .sort((a, b) => a.order - b.order)
        },

        getDirectListsBySpace: (spaceId) => {
          return Object.values(get().lists)
            .filter(l => l.spaceId === spaceId && !l.folderId)
            .sort((a, b) => a.order - b.order)
        },

        getSidebarTree: () => {
          const state = get()
          const workspaceId = state.activeWorkspaceId
          if (!workspaceId) return []

          const spaces = state.getSpacesByWorkspace(workspaceId)

          return spaces.map(space => {
            const folders = state.getFoldersBySpace(space.id)
            const directLists = state.getDirectListsBySpace(space.id)

            const folderNodes: SidebarNode[] = folders.map(folder => {
              const folderLists = state.getListsByFolder(folder.id)
              return {
                id: folder.id,
                type: 'folder' as const,
                name: folder.name,
                icon: folder.icon,
                color: folder.color,
                order: folder.order,
                children: folderLists.map(list => ({
                  id: list.id,
                  type: 'list' as const,
                  name: list.name,
                  icon: list.icon,
                  color: list.color,
                  order: list.order,
                  taskCount: list.taskCount,
                  children: [],
                })),
              }
            })

            const directListNodes: SidebarNode[] = directLists.map(list => ({
              id: list.id,
              type: 'list' as const,
              name: list.name,
              icon: list.icon,
              color: list.color,
              order: list.order,
              taskCount: list.taskCount,
              children: [],
            }))

            return {
              id: space.id,
              type: 'space' as const,
              name: space.name,
              icon: space.icon,
              color: space.color,
              department: space.department,
              order: space.order,
              children: [...folderNodes, ...directListNodes],
            }
          })
        },

        // ==================== UI SLICE ====================

        sidebarCollapsed: false,
        sidebarWidth: 280,
        rightPanelOpen: false,
        rightPanelContent: null,
        currentViewType: 'board',
        currentViewId: null,
        activeFilters: { ...DEFAULT_FILTERS },

        modals: {
          createTask: false,
          createSpace: false,
          createList: false,
          createReport: false,
          createForm: false,
          editTask: null,
          confirmDelete: null,
          userProfile: false,
          adminUsers: false,
          settings: false,
          commandPalette: false,
        },

        globalSearch: '',
        theme: 'dark',
        toasts: [],

        toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

        setRightPanel: (content) => set({
          rightPanelOpen: content !== null,
          rightPanelContent: content,
        }),

        toggleRightPanel: () => set((s) => ({
          rightPanelOpen: !s.rightPanelOpen,
        })),

        setCurrentView: (type, viewId) => set({
          currentViewType: type,
          currentViewId: viewId || null,
        }),

        setActiveFilters: (filters) => set((s) => ({
          activeFilters: { ...s.activeFilters, ...filters }
        })),

        resetFilters: () => set({ activeFilters: { ...DEFAULT_FILTERS } }),

        openModal: (modal, payload) => set((s) => ({
          modals: {
            ...s.modals,
            [modal]: payload ?? true,
          }
        })),

        closeModal: (modal) => set((s) => ({
          modals: {
            ...s.modals,
            [modal]: typeof s.modals[modal] === 'string' ? null : false,
          }
        })),

        closeAllModals: () => set({
          modals: {
            createTask: false,
            createSpace: false,
            createList: false,
            createReport: false,
            createForm: false,
            editTask: null,
            confirmDelete: null,
            userProfile: false,
            adminUsers: false,
            settings: false,
            commandPalette: false,
          }
        }),

        setGlobalSearch: (search) => set({ globalSearch: search }),

        addToast: (toast) => set((s) => ({
          toasts: [...s.toasts, { ...toast, id: `toast_${Date.now()}_${Math.random().toString(36).slice(2)}` }]
        })),

        removeToast: (id) => set((s) => ({
          toasts: s.toasts.filter(t => t.id !== id)
        })),

        setTheme: (theme) => set({ theme }),

        // ==================== AUTH SLICE ====================

        user: null,
        isAuthenticated: false,
        isAuthLoading: true,

        setUser: (user) => set({
          user,
          isAuthenticated: !!user,
          isAuthLoading: false,
        }),

        setAuthLoading: (loading) => set({ isAuthLoading: loading }),

        logout: () => set({
          user: null,
          isAuthenticated: false,
          // Limpiar todo el estado al cerrar sesión
          tasks: {},
          taskIds: [],
          tasksByList: {},
          selectedTaskId: null,
          spaces: {},
          folders: {},
          lists: {},
          activeWorkspaceId: null,
          activeSpaceId: null,
          activeFolderId: null,
          activeListId: null,
          notifications: [],
          unreadCount: 0,
        }),

        hasPermission: (permission) => {
          const user = get().user
          return user?.permissions?.[permission] ?? false
        },

        isAtLeastRole: (minimumRole) => {
          const user = get().user
          if (!user) return false
          return (ROLE_HIERARCHY[user.role] ?? 0) >= (ROLE_HIERARCHY[minimumRole] ?? 0)
        },

        canAccessDepartment: (department) => {
          const user = get().user
          if (!user) return false
          if (user.permissions?.canViewAllDepartments) return true
          return user.department === department
        },

        // ==================== NORA SLICE ====================

        isNoraOpen: false,
        isNoraThinking: false,
        noraConversation: [],
        noraInsights: [],
        unreadInsights: 0,

        toggleNora: () => set((s) => ({
          isNoraOpen: !s.isNoraOpen,
          rightPanelOpen: !s.isNoraOpen,
          rightPanelContent: !s.isNoraOpen ? 'nora' : s.rightPanelContent,
        })),

        setNoraThinking: (thinking) => set({ isNoraThinking: thinking }),

        addNoraMessage: (message) => set((s) => ({
          noraConversation: [...s.noraConversation, message]
        })),

        clearNoraConversation: () => set({ noraConversation: [] }),

        setNoraInsights: (insights) => set({
          noraInsights: insights,
          unreadInsights: insights.filter(i => !i.isAcknowledged).length,
        }),

        acknowledgeInsight: (insightId) => set((s) => ({
          noraInsights: s.noraInsights.map(i =>
            i.id === insightId ? { ...i, isAcknowledged: true } : i
          ),
          unreadInsights: Math.max(0, s.unreadInsights - 1),
        })),

        // ==================== NOTIFICATION SLICE ====================

        notifications: [],
        unreadCount: 0,

        setNotifications: (notifications) => set({
          notifications,
          unreadCount: notifications.filter(n => !n.isRead).length,
        }),

        addNotification: (notification) => set((s) => ({
          notifications: [notification, ...s.notifications],
          unreadCount: s.unreadCount + (notification.isRead ? 0 : 1),
        })),

        markAsRead: (notificationId) => set((s) => {
          const notification = s.notifications.find(n => n.id === notificationId)
          const wasUnread = notification && !notification.isRead

          return {
            notifications: s.notifications.map(n =>
              n.id === notificationId ? { ...n, isRead: true } : n
            ),
            unreadCount: wasUnread ? s.unreadCount - 1 : s.unreadCount,
          }
        }),

        markAllAsRead: () => set((s) => ({
          notifications: s.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0,
        })),

        removeNotification: (notificationId) => set((s) => {
          const notification = s.notifications.find(n => n.id === notificationId)
          const wasUnread = notification && !notification.isRead

          return {
            notifications: s.notifications.filter(n => n.id !== notificationId),
            unreadCount: wasUnread ? s.unreadCount - 1 : s.unreadCount,
          }
        }),
      }),
    ),
    { name: 'solis-os-store' }
  )
)

// ======================== SELECTORES GRANULARES ========================
// Estos hooks evitan re-renders innecesarios al suscribirse solo a partes específicas

/** Solo el usuario actual */
export const useCurrentUser = () => useAppStore(s => s.user)

/** Solo los permisos */
export const usePermissions = () => useAppStore(s => ({
  hasPermission: s.hasPermission,
  isAtLeastRole: s.isAtLeastRole,
  canAccessDepartment: s.canAccessDepartment,
}))

/** Solo el estado del sidebar */
export const useSidebar = () => useAppStore(s => ({
  collapsed: s.sidebarCollapsed,
  toggle: s.toggleSidebar,
  tree: s.getSidebarTree(),
}))

/** Solo los filtros activos */
export const useFilters = () => useAppStore(s => ({
  filters: s.activeFilters,
  setFilters: s.setActiveFilters,
  resetFilters: s.resetFilters,
}))

/** Solo el estado de Nora */
export const useNora = () => useAppStore(s => ({
  isOpen: s.isNoraOpen,
  isThinking: s.isNoraThinking,
  conversation: s.noraConversation,
  insights: s.noraInsights,
  unreadInsights: s.unreadInsights,
  toggle: s.toggleNora,
  addMessage: s.addNoraMessage,
  clearConversation: s.clearNoraConversation,
  acknowledgeInsight: s.acknowledgeInsight,
}))

/** Estadísticas de la lista activa */
export const useActiveListStats = () => {
  const activeListId = useAppStore(s => s.activeListId)
  const getTaskStats = useAppStore(s => s.getTaskStats)
  return activeListId ? getTaskStats(activeListId) : getTaskStats()
}

/** Tareas filtradas de la lista activa */
export const useActiveListTasks = () => {
  const activeListId = useAppStore(s => s.activeListId)
  const filters = useAppStore(s => s.activeFilters)
  const getFilteredTasks = useAppStore(s => s.getFilteredTasks)

  if (!activeListId) return []
  return getFilteredTasks(activeListId, filters)
}

/** Modales */
export const useModals = () => useAppStore(s => ({
  modals: s.modals,
  openModal: s.openModal,
  closeModal: s.closeModal,
  closeAllModals: s.closeAllModals,
}))

/** Toasts */
export const useToasts = () => useAppStore(s => ({
  toasts: s.toasts,
  addToast: s.addToast,
  removeToast: s.removeToast,
}))
