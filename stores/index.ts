import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Task, TaskStatus, Space, Folder, TaskList, User } from '../types'

// ==================== TASK STORE ====================

interface TaskState {
  tasks: Task[]
  selectedTask: Task | null
  isLoading: boolean
  error: string | null
}

interface TaskActions {
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, newStatus: TaskStatus, newOrder: number) => void
  selectTask: (task: Task | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useTaskStore = create<TaskState & TaskActions>()(
  devtools(
    (set) => ({
      // State
      tasks: [],
      selectedTask: null,
      isLoading: false,
      error: null,

      // Actions
      setTasks: (tasks) => set({ tasks }),
      
      addTask: (task) =>
        set((state) => ({ tasks: [...state.tasks, task] })),
      
      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
          selectedTask:
            state.selectedTask?.id === id
              ? { ...state.selectedTask, ...updates }
              : state.selectedTask,
        })),
      
      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
        })),
      
      moveTask: (taskId, newStatus, newOrder) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: newStatus, order: newOrder } : t
          ),
        })),
      
      selectTask: (task) => set({ selectedTask: task }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'task-store' }
  )
)

// ==================== WORKSPACE STORE (Spaces, Folders, Lists) ====================

interface WorkspaceState {
  spaces: Space[]
  folders: Folder[]
  lists: TaskList[]
  activeSpaceId: string | null
  activeFolderId: string | null
  activeListId: string | null
}

interface WorkspaceActions {
  setSpaces: (spaces: Space[]) => void
  setFolders: (folders: Folder[]) => void
  setLists: (lists: TaskList[]) => void
  setActiveSpace: (id: string | null) => void
  setActiveFolder: (id: string | null) => void
  setActiveList: (id: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()(
  devtools(
    persist(
      (set) => ({
        // State
        spaces: [],
        folders: [],
        lists: [],
        activeSpaceId: null,
        activeFolderId: null,
        activeListId: null,

        // Actions
        setSpaces: (spaces) => set({ spaces }),
        setFolders: (folders) => set({ folders }),
        setLists: (lists) => set({ lists }),
        setActiveSpace: (id) => set({ activeSpaceId: id }),
        setActiveFolder: (id) => set({ activeFolderId: id }),
        setActiveList: (id) => set({ activeListId: id }),
      }),
      { name: 'workspace-storage' }
    ),
    { name: 'workspace-store' }
  )
)

// ==================== AUTH STORE ====================

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-store' }
  )
)

// ==================== UI STORE ====================

type ViewMode = 'board' | 'list' | 'calendar'

interface UIState {
  sidebarCollapsed: boolean
  viewMode: ViewMode
  taskPanelOpen: boolean
}

interface UIActions {
  toggleSidebar: () => void
  setViewMode: (mode: ViewMode) => void
  toggleTaskPanel: () => void
  setTaskPanelOpen: (open: boolean) => void
}

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        viewMode: 'board',
        taskPanelOpen: false,

        toggleSidebar: () =>
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setViewMode: (mode) => set({ viewMode: mode }),
        toggleTaskPanel: () =>
          set((state) => ({ taskPanelOpen: !state.taskPanelOpen })),
        setTaskPanelOpen: (open) => set({ taskPanelOpen: open }),
      }),
      { name: 'ui-storage' }
    ),
    { name: 'ui-store' }
  )
)
