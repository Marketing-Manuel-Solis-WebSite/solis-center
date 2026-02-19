/**
 * ============================================================================
 * SOLIS OS — SIDEBAR (Navegación Principal)
 * ============================================================================
 * Panel lateral con:
 *   - Logo y branding
 *   - Árbol jerárquico: Spaces → Folders → Lists
 *   - Accesos rápidos: Mis Tareas, Inbox, Docs
 *   - Panel de usuario y Nora toggle
 *   - Colapsable con animación suave
 * ============================================================================
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import type { ISpace, IFolder, IList } from '../../types/schema'

// ======================== CONSTANTES ========================

const SIDEBAR_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 64

const SPACE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444', '#3b82f6']

// ======================== SIDEBAR PRINCIPAL ========================

export default function Sidebar() {
  const collapsed = useAppStore(s => s.sidebarCollapsed)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const activeSpaceId = useAppStore(s => s.activeSpaceId)
  const activeListId = useAppStore(s => s.activeListId)
  const setActiveSpace = useAppStore(s => s.setActiveSpace)
  const setActiveList = useAppStore(s => s.setActiveList)
  const setActiveFolder = useAppStore(s => s.setActiveFolder)
  const openModal = useAppStore(s => s.openModal)
  const setRightPanel = useAppStore(s => s.setRightPanel)
  const currentUser = useAppStore(s => s.user)
  const unreadCount = useAppStore(s => s.unreadCount)

  // Obtener árbol de jerarquía
  const spaces = useAppStore(s => Object.values(s.spaces).sort((a, b) => a.order - b.order))
  const folders = useAppStore(s => s.folders)
  const lists = useAppStore(s => s.lists)

  // Construir árbol
  const tree = useMemo(() => {
    return spaces.map(space => {
      const spaceFolders = Object.values(folders)
        .filter(f => f.spaceId === space.id)
        .sort((a, b) => a.order - b.order)
        .map(folder => ({
          ...folder,
          lists: Object.values(lists)
            .filter(l => l.folderId === folder.id)
            .sort((a, b) => a.order - b.order),
        }))

      const looseLists = Object.values(lists)
        .filter(l => l.spaceId === space.id && !l.folderId)
        .sort((a, b) => a.order - b.order)

      return { ...space, folders: spaceFolders, looseLists }
    })
  }, [spaces, folders, lists])

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  return (
    <aside style={{
      width, minWidth: width, height: '100vh',
      background: '#0c0c14', borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden', position: 'relative',
    }}>

      {/* ===== HEADER ===== */}
      <div style={{
        padding: collapsed ? '16px 12px' : '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 800, color: 'white',
            }}>S</div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>
              Solis OS
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          style={{
            background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: '6px',
            padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed
              ? <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
              : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
            }
          </svg>
        </button>
      </div>

      {/* ===== QUICK LINKS ===== */}
      {!collapsed && (
        <div style={{ padding: '12px 12px 4px' }}>
          {[
            { id: 'my_tasks', label: 'Mis Tareas', icon: '⚡', badge: 0 },
            { id: 'inbox', label: 'Inbox', icon: '📥', badge: unreadCount },
            { id: 'docs', label: 'Documentos', icon: '📄', badge: 0 },
            { id: 'nora', label: 'Nora IA', icon: '✨', badge: 0 },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'nora') setRightPanel('nora')
                if (item.id === 'inbox') setRightPanel('notifications')
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', borderRadius: '8px', border: 'none',
                background: 'transparent', color: 'rgba(255,255,255,0.55)',
                fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.1s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  padding: '1px 7px', borderRadius: '9999px',
                  background: '#6366f1', color: 'white', fontSize: '10px', fontWeight: 700,
                }}>{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ===== DIVIDER ===== */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '8px 16px' }} />

      {/* ===== SPACES HEADER ===== */}
      {!collapsed && (
        <div style={{
          padding: '4px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Spaces
          </span>
          <button
            onClick={() => openModal('createSpace')}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer', padding: '2px', fontSize: '16px', lineHeight: 1,
            }}
          >+</button>
        </div>
      )}

      {/* ===== HIERARCHY TREE ===== */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 8px 16px' }}>
        {tree.map((space, spaceIndex) => (
          <SpaceNode
            key={space.id}
            space={space}
            color={SPACE_COLORS[spaceIndex % SPACE_COLORS.length]}
            isActive={activeSpaceId === space.id}
            activeListId={activeListId}
            collapsed={collapsed}
            onSelectSpace={() => setActiveSpace(space.id)}
            onSelectFolder={(folderId) => setActiveFolder(folderId)}
            onSelectList={(listId) => setActiveList(listId)}
          />
        ))}

        {tree.length === 0 && !collapsed && (
          <div style={{
            padding: '20px', textAlign: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: '12px',
          }}>
            No hay spaces.
            <br />
            <button
              onClick={() => openModal('createSpace')}
              style={{
                marginTop: '8px', background: 'none', border: 'none',
                color: '#818cf8', cursor: 'pointer', fontSize: '12px',
              }}
            >
              + Crear Space
            </button>
          </div>
        )}
      </div>

      {/* ===== USER FOOTER ===== */}
      {!collapsed && currentUser && (
        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {currentUser.avatar || currentUser.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
              {currentUser.role}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

// ======================== SPACE NODE ========================

interface SpaceNodeProps {
  space: ISpace & {
    folders: (IFolder & { lists: IList[] })[]
    looseLists: IList[]
  }
  color: string
  isActive: boolean
  activeListId: string | null
  collapsed: boolean
  onSelectSpace: () => void
  onSelectFolder: (id: string) => void
  onSelectList: (id: string) => void
}

function SpaceNode({ space, color, isActive, activeListId, collapsed, onSelectSpace, onSelectFolder, onSelectList }: SpaceNodeProps) {
  const [expanded, setExpanded] = useState(isActive)

  if (collapsed) {
    return (
      <button
        onClick={onSelectSpace}
        title={space.name}
        style={{
          width: '40px', height: '40px', margin: '4px auto', borderRadius: '10px',
          background: isActive ? `${color}25` : 'transparent',
          border: isActive ? `1px solid ${color}40` : '1px solid transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: color, fontSize: '14px', fontWeight: 700,
        }}
      >
        {space.icon || space.name.charAt(0).toUpperCase()}
      </button>
    )
  }

  return (
    <div style={{ marginBottom: '4px' }}>
      {/* Space Header */}
      <button
        onClick={() => { setExpanded(!expanded); onSelectSpace() }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', borderRadius: '8px', border: 'none',
          background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
          cursor: 'pointer', transition: 'all 0.1s',
        }}
        onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
          ▶
        </span>
        <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: color, flexShrink: 0 }} />
        <span style={{
          fontSize: '13px', fontWeight: 500, color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left',
        }}>
          {space.name}
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
          {space.folders.reduce((sum, f) => sum + f.lists.length, 0) + space.looseLists.length}
        </span>
      </button>

      {/* Children */}
      {expanded && (
        <div style={{ paddingLeft: '20px', marginTop: '2px' }}>
          {/* Folders */}
          {space.folders.map(folder => (
            <FolderNode
              key={folder.id}
              folder={folder}
              activeListId={activeListId}
              onSelectList={onSelectList}
            />
          ))}

          {/* Loose Lists */}
          {space.looseLists.map(list => (
            <ListItem
              key={list.id}
              list={list}
              isActive={activeListId === list.id}
              onClick={() => onSelectList(list.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ======================== FOLDER NODE ========================

function FolderNode({ folder, activeListId, onSelectList }: {
  folder: IFolder & { lists: IList[] }
  activeListId: string | null
  onSelectList: (id: string) => void
}) {
  const hasActiveChild = folder.lists.some(l => l.id === activeListId)
  const [expanded, setExpanded] = useState(hasActiveChild)

  return (
    <div style={{ marginBottom: '2px' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 8px', borderRadius: '6px', border: 'none',
          background: 'transparent', cursor: 'pointer',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.25)', transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>▶</span>
        <span style={{ fontSize: '12px' }}>📁</span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {folder.name}
        </span>
      </button>

      {expanded && (
        <div style={{ paddingLeft: '16px' }}>
          {folder.lists.map(list => (
            <ListItem
              key={list.id}
              list={list}
              isActive={activeListId === list.id}
              onClick={() => onSelectList(list.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ======================== LIST ITEM ========================

function ListItem({ list, isActive, onClick }: { list: IList; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '5px 8px', borderRadius: '6px', border: 'none',
        background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
        cursor: 'pointer', transition: 'all 0.1s',
      }}
      onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = isActive ? 'rgba(99,102,241,0.15)' : 'transparent')}
    >
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#818cf8' : 'rgba(255,255,255,0.15)' }} />
      <span style={{
        fontSize: '12px', color: isActive ? '#c7d2fe' : 'rgba(255,255,255,0.45)',
        fontWeight: isActive ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', flex: 1, textAlign: 'left',
      }}>
        {list.name}
      </span>
      {list.taskCount > 0 && (
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
          {list.taskCount}
        </span>
      )}
    </button>
  )
}
