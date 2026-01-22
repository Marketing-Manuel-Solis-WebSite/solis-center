'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../AuthProvider'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  serverTimestamp,
  where,
  getDocs,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase'
import { User, Department } from '../../types'

// ==================== TIPOS ====================
interface DirectMessage {
  id: string
  participants: string[] // Array de user IDs
  participantsData: Array<{ id: string; name: string; avatar: string; department: string }>
  lastMessage: string
  lastMessageBy: string
  lastMessageAt: any
  unreadCount: Record<string, number>
  createdAt: any
}

interface GroupChat {
  id: string
  name: string
  description: string
  avatar: string
  members: string[]
  admins: string[]
  department?: Department
  createdBy: string
  createdAt: any
  lastMessage?: string
  lastMessageAt?: any
  unreadCount: Record<string, number>
}

interface Message {
  id: string
  chatId: string
  chatType: 'direct' | 'group'
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  type: 'text' | 'file' | 'image' | 'system'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  replyTo?: string
  mentions?: string[]
  reactions?: Record<string, string[]> // emoji: [userIds]
  edited?: boolean
  editedAt?: any
  deletedFor?: string[]
  timestamp: any
  readBy: string[]
}

interface TypingIndicator {
  userId: string
  userName: string
  chatId: string
  timestamp: number
}

// ==================== ICONOS ====================
const Icons = {
  Send: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Paperclip: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  Image: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Smile: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  MoreVertical: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  CheckDouble: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L7 17l-5-5"/><path d="M22 6L11 17l-1.5-1.5"/></svg>,
  Reply: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Phone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Video: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  Pin: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>,
  Hash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Bell: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
}

// ==================== EMOJIS RÁPIDOS ====================
const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏']

// ==================== COMPONENTE PRINCIPAL ====================
export default function MessagesView() {
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Estados principales
  const [users, setUsers] = useState<User[]>([])
  const [directChats, setDirectChats] = useState<DirectMessage[]>([])
  const [groupChats, setGroupChats] = useState<GroupChat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedChat, setSelectedChat] = useState<{ id: string; type: 'direct' | 'group' } | null>(null)
  
  // Estados de UI
  const [messageText, setMessageText] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [uploading, setUploading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [showChatInfo, setShowChatInfo] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups'>('all')

  // Estados para nuevo grupo
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  // ==================== CARGAR USUARIOS ====================
  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as User))
        .filter(u => u.id !== user.id && u.isActive)
      setUsers(usersData)
    })
    return () => unsub()
  }, [user])

  // ==================== CARGAR CHATS DIRECTOS ====================
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'direct_chats'),
      where('participants', 'array-contains', user.id),
      orderBy('lastMessageAt', 'desc')
    )
    const unsub = onSnapshot(q, (snapshot) => {
      setDirectChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DirectMessage)))
    })
    return () => unsub()
  }, [user])

  // ==================== CARGAR GRUPOS ====================
  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'group_chats'),
      where('members', 'array-contains', user.id),
      orderBy('lastMessageAt', 'desc')
    )
    const unsub = onSnapshot(q, (snapshot) => {
      setGroupChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GroupChat)))
    })
    return () => unsub()
  }, [user])

  // ==================== CARGAR MENSAJES DEL CHAT SELECCIONADO ====================
  useEffect(() => {
    if (!selectedChat || !user) return

    const chatCollection = selectedChat.type === 'direct' ? 'direct_messages' : 'group_messages'
    const q = query(
      collection(db, chatCollection),
      where('chatId', '==', selectedChat.id),
      orderBy('timestamp', 'asc')
    )

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message))
        .filter(m => !m.deletedFor?.includes(user.id))
      setMessages(msgs)

      // Marcar como leídos
      msgs.forEach(async (msg) => {
        if (msg.senderId !== user.id && !msg.readBy.includes(user.id)) {
          await updateDoc(doc(db, chatCollection, msg.id), {
            readBy: arrayUnion(user.id)
          })
        }
      })

      // Resetear contador de no leídos
      if (selectedChat.type === 'direct') {
        const chatRef = doc(db, 'direct_chats', selectedChat.id)
        updateDoc(chatRef, { [`unreadCount.${user.id}`]: 0 })
      } else {
        const chatRef = doc(db, 'group_chats', selectedChat.id)
        updateDoc(chatRef, { [`unreadCount.${user.id}`]: 0 })
      }
    })

    return () => unsub()
  }, [selectedChat, user])

  // ==================== AUTO-SCROLL ====================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ==================== CREAR CHAT DIRECTO ====================
  const startDirectChat = async (otherUserId: string) => {
    if (!user) return

    // Buscar si ya existe
    const existingChat = directChats.find(chat => 
      chat.participants.includes(otherUserId)
    )

    if (existingChat) {
      setSelectedChat({ id: existingChat.id, type: 'direct' })
      setShowNewChatModal(false)
      return
    }

    // Crear nuevo chat
    const otherUser = users.find(u => u.id === otherUserId)
    if (!otherUser) return

    const newChat: Omit<DirectMessage, 'id'> = {
      participants: [user.id, otherUserId],
      participantsData: [
        { id: user.id, name: user.name, avatar: user.avatar || 'U', department: user.department },
        { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar || 'U', department: otherUser.department }
      ],
      lastMessage: '',
      lastMessageBy: '',
      lastMessageAt: serverTimestamp(),
      unreadCount: { [user.id]: 0, [otherUserId]: 0 },
      createdAt: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, 'direct_chats'), newChat)
    setSelectedChat({ id: docRef.id, type: 'direct' })
    setShowNewChatModal(false)
  }

  // ==================== CREAR GRUPO ====================
  const createGroup = async () => {
    if (!user || !newGroupName.trim() || selectedMembers.length === 0) {
      alert('❌ Completa el nombre y selecciona al menos un miembro')
      return
    }

    const unreadCount: Record<string, number> = {}
    selectedMembers.forEach(id => { unreadCount[id] = 0 })
    unreadCount[user.id] = 0

    const newGroup: Omit<GroupChat, 'id'> = {
      name: newGroupName,
      description: newGroupDescription,
      avatar: newGroupName.slice(0, 2).toUpperCase(),
      members: [user.id, ...selectedMembers],
      admins: [user.id],
      department: user.department as Department,
      createdBy: user.id,
      createdAt: serverTimestamp(),
      unreadCount
    }

    const docRef = await addDoc(collection(db, 'group_chats'), newGroup)
    
    // Mensaje del sistema
    await addDoc(collection(db, 'group_messages'), {
      chatId: docRef.id,
      chatType: 'group',
      senderId: 'system',
      senderName: 'Sistema',
      senderAvatar: 'S',
      content: `${user.name} creó este grupo`,
      type: 'system',
      timestamp: serverTimestamp(),
      readBy: [user.id]
    })

    setSelectedChat({ id: docRef.id, type: 'group' })
    setShowNewGroupModal(false)
    setNewGroupName('')
    setNewGroupDescription('')
    setSelectedMembers([])
  }

  // ==================== ENVIAR MENSAJE ====================
  const sendMessage = async () => {
    if (!user || !selectedChat || (!messageText.trim() && !uploading)) return

    const chatCollection = selectedChat.type === 'direct' ? 'direct_messages' : 'group_messages'
    const chatRefCollection = selectedChat.type === 'direct' ? 'direct_chats' : 'group_chats'

    // Detectar menciones (@usuario)
    const mentions = messageText.match(/@\w+/g)?.map(m => m.slice(1)) || []

    const newMessage: Omit<Message, 'id'> = {
      chatId: selectedChat.id,
      chatType: selectedChat.type,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar || user.name.slice(0, 2).toUpperCase(),
      content: messageText.trim(),
      type: 'text',
      timestamp: serverTimestamp(),
      readBy: [user.id],
      mentions,
      ...(replyingTo && { replyTo: replyingTo.id })
    }

    if (editingMessage) {
      // Editar mensaje existente
      await updateDoc(doc(db, chatCollection, editingMessage.id), {
        content: messageText.trim(),
        edited: true,
        editedAt: serverTimestamp()
      })
      setEditingMessage(null)
    } else {
      // Nuevo mensaje
      await addDoc(collection(db, chatCollection), newMessage)

      // Actualizar último mensaje en el chat
      await updateDoc(doc(db, chatRefCollection, selectedChat.id), {
        lastMessage: messageText.trim(),
        lastMessageBy: user.id,
        lastMessageAt: serverTimestamp()
      })

      // Incrementar contador de no leídos para otros usuarios
      const chat = selectedChat.type === 'direct' 
        ? directChats.find(c => c.id === selectedChat.id)
        : groupChats.find(c => c.id === selectedChat.id)

      if (chat) {
        const otherUsers = selectedChat.type === 'direct'
          ? (chat as DirectMessage).participants.filter(p => p !== user.id)
          : (chat as GroupChat).members.filter(m => m !== user.id)

        const updates: Record<string, number> = {}
        otherUsers.forEach(userId => {
          const currentCount = chat.unreadCount[userId] || 0
          updates[`unreadCount.${userId}`] = currentCount + 1
        })

        await updateDoc(doc(db, chatRefCollection, selectedChat.id), updates)
      }
    }

    setMessageText('')
    setReplyingTo(null)
  }

  // ==================== SUBIR ARCHIVO ====================
  const handleFileUpload = async (file: File, type: 'file' | 'image') => {
    if (!user || !selectedChat) return

    setUploading(true)
    try {
      const storagePath = `chat_files/${selectedChat.type}/${selectedChat.id}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, file)
      const fileUrl = await getDownloadURL(storageRef)

      const chatCollection = selectedChat.type === 'direct' ? 'direct_messages' : 'group_messages'

      const newMessage: Omit<Message, 'id'> = {
        chatId: selectedChat.id,
        chatType: selectedChat.type,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar || user.name.slice(0, 2).toUpperCase(),
        content: type === 'image' ? '📷 Imagen' : `📎 ${file.name}`,
        type,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        timestamp: serverTimestamp(),
        readBy: [user.id]
      }

      await addDoc(collection(db, chatCollection), newMessage)

      alert('✅ Archivo enviado')
    } catch (error) {
      console.error(error)
      alert('❌ Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  // ==================== REACCIONAR A MENSAJE ====================
  const addReaction = async (messageId: string, emoji: string) => {
    if (!user || !selectedChat) return

    const chatCollection = selectedChat.type === 'direct' ? 'direct_messages' : 'group_messages'
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const reactions = message.reactions || {}
    const userReacted = reactions[emoji]?.includes(user.id)

    if (userReacted) {
      // Quitar reacción
      await updateDoc(doc(db, chatCollection, messageId), {
        [`reactions.${emoji}`]: arrayRemove(user.id)
      })
    } else {
      // Agregar reacción
      await updateDoc(doc(db, chatCollection, messageId), {
        [`reactions.${emoji}`]: arrayUnion(user.id)
      })
    }

    setShowEmojiPicker(null)
  }

  // ==================== ELIMINAR MENSAJE (PARA MÍ) ====================
  const deleteMessageForMe = async (messageId: string) => {
    if (!user || !selectedChat) return

    const chatCollection = selectedChat.type === 'direct' ? 'direct_messages' : 'group_messages'
    await updateDoc(doc(db, chatCollection, messageId), {
      deletedFor: arrayUnion(user.id)
    })
  }

  // ==================== FORMATEAR HORA ====================
  const formatTime = (timestamp: any) => {
    if (!timestamp?.seconds) return ''
    const date = new Date(timestamp.seconds * 1000)
    const now = new Date()
    
    const isToday = date.toDateString() === now.toDateString()
    const isThisWeek = (now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000

    if (isToday) {
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    } else if (isThisWeek) {
      return date.toLocaleDateString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    }
  }

  // ==================== OBTENER DATOS DEL CHAT ACTUAL ====================
  const getCurrentChatData = () => {
    if (!selectedChat) return null

    if (selectedChat.type === 'direct') {
      const chat = directChats.find(c => c.id === selectedChat.id)
      if (!chat) return null
      const otherUser = chat.participantsData.find(p => p.id !== user?.id)
      return {
        name: otherUser?.name || 'Usuario',
        avatar: otherUser?.avatar || 'U',
        subtitle: otherUser?.department || 'Departamento',
        isGroup: false
      }
    } else {
      const group = groupChats.find(g => g.id === selectedChat.id)
      if (!group) return null
      return {
        name: group.name,
        avatar: group.avatar,
        subtitle: `${group.members.length} miembros`,
        isGroup: true
      }
    }
  }

  const currentChatData = getCurrentChatData()

  // ==================== FILTRAR CHATS ====================
  const allChats = [
    ...directChats.map(c => ({ ...c, type: 'direct' as const })),
    ...groupChats.map(c => ({ ...c, type: 'group' as const }))
  ].sort((a, b) => {
    const timeA = a.lastMessageAt?.seconds || 0
    const timeB = b.lastMessageAt?.seconds || 0
    return timeB - timeA
  })

  const filteredChats = allChats.filter(chat => {
    // Filtro de búsqueda
    const searchLower = searchTerm.toLowerCase()
    let matchesSearch = false

    if (chat.type === 'direct') {
      const otherUser = chat.participantsData.find(p => p.id !== user?.id)
      matchesSearch = otherUser?.name.toLowerCase().includes(searchLower) || false
    } else {
      matchesSearch = chat.name.toLowerCase().includes(searchLower)
    }

    if (!matchesSearch) return false

    // Filtro de tab
    if (activeTab === 'unread') {
      return (chat.unreadCount[user?.id || ''] || 0) > 0
    } else if (activeTab === 'groups') {
      return chat.type === 'group'
    }

    return true
  })

  // ==================== RENDER ====================
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', height: 'calc(100vh - 140px)', gap: '20px' }}>
      
      {/* ==================== SIDEBAR - LISTA DE CHATS ==================== */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#1a1a24', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        
        {/* Header del Sidebar */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            💬 Mensajes
          </h2>

          {/* Búsqueda */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}>
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Botones Nueva Conversación */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowNewChatModal(true)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(99,102,241,0.2)',
                border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Icons.Plus />
              Nuevo
            </button>
            <button
              onClick={() => setShowNewGroupModal(true)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#a78bfa',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Icons.Users />
              Grupo
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '16px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px' }}>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'unread', label: 'No leídos' },
              { key: 'groups', label: 'Grupos' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === tab.key ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: activeTab === tab.key ? '#818cf8' : 'rgba(255,255,255,0.5)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Chats */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {filteredChats.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>💬</div>
              <p style={{ fontSize: '14px' }}>No hay conversaciones</p>
              <p style={{ fontSize: '12px', marginTop: '6px', opacity: 0.7 }}>
                {searchTerm ? 'Intenta con otra búsqueda' : 'Inicia una nueva conversación'}
              </p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const isSelected = selectedChat?.id === chat.id
              const unreadCount = chat.unreadCount[user?.id || ''] || 0

              let chatName = ''
              let chatAvatar = ''
              let chatSubtitle = ''

              if (chat.type === 'direct') {
                const otherUser = chat.participantsData.find(p => p.id !== user?.id)
                chatName = otherUser?.name || 'Usuario'
                chatAvatar = otherUser?.avatar || 'U'
                chatSubtitle = chat.lastMessage || 'Nueva conversación'
              } else {
                chatName = chat.name
                chatAvatar = chat.avatar
                chatSubtitle = chat.lastMessage || 'Grupo creado'
              }

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat({ id: chat.id, type: chat.type })}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent',
                    border: isSelected ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    marginBottom: '8px',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: chat.type === 'group' ? '12px' : '50%',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'white',
                      flexShrink: 0,
                      position: 'relative'
                    }}>
                      {chatAvatar}
                      {chat.type === 'group' && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#1a1a24',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #1a1a24'
                        }}>
                          <Icons.Users />
                        </div>
                      )}
                    </div>

                    {/* Contenido */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h4 style={{
                          fontSize: '14px',
                          fontWeight: unreadCount > 0 ? 700 : 500,
                          color: 'white',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {chatName}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          {formatTime(chat.lastMessageAt)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{
                          fontSize: '13px',
                          color: unreadCount > 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: unreadCount > 0 ? 600 : 400
                        }}>
                          {chatSubtitle}
                        </p>
                        {unreadCount > 0 && (
                          <div style={{
                            minWidth: '20px',
                            height: '20px',
                            borderRadius: '10px',
                            background: '#6366f1',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 6px',
                            marginLeft: '8px'
                          }}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ==================== ÁREA DE CHAT ==================== */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#12121a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        
        {!selectedChat ? (
          // Estado vacío
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px', opacity: 0.2 }}>💬</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
              Selecciona una conversación
            </h3>
            <p style={{ fontSize: '14px', opacity: 0.7, textAlign: 'center', maxWidth: '300px' }}>
              Elige un chat existente o inicia una nueva conversación con tus compañeros
            </p>
          </div>
        ) : (
          <>
            {/* Header del Chat */}
            {currentChatData && (
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a24' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: currentChatData.isGroup ? '12px' : '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                  }}>
                    {currentChatData.avatar}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
                      {currentChatData.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                      {currentChatData.subtitle}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px'
                    }}
                    title="Llamada de voz"
                  >
                    <Icons.Phone />
                  </button>
                  <button
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px'
                    }}
                    title="Videollamada"
                  >
                    <Icons.Video />
                  </button>
                  <button
                    onClick={() => setShowChatInfo(!showChatInfo)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: showChatInfo ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${showChatInfo ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      color: showChatInfo ? '#818cf8' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '13px'
                    }}
                    title="Información"
                  >
                    <Icons.MoreVertical />
                  </button>
                </div>
              </div>
            )}

            {/* Mensajes */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.02) 0%, transparent 70%)'
            }}>
              {messages.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.2 }}>👋</div>
                  <p style={{ fontSize: '15px' }}>¡Inicia la conversación!</p>
                  <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
                    Escribe tu primer mensaje abajo
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMyMessage = msg.senderId === user?.id
                  const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId
                  const isSystem = msg.type === 'system'

                  if (isSystem) {
                    return (
                      <div key={msg.id} style={{ textAlign: 'center', margin: '20px 0' }}>
                        <span style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.4)',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          {msg.content}
                        </span>
                      </div>
                    )
                  }

                  // Mensaje de respuesta referenciado
                  const replyToMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: isMyMessage ? 'row-reverse' : 'row',
                        gap: '12px',
                        marginBottom: showAvatar ? '16px' : '4px',
                        alignItems: 'flex-end'
                      }}
                    >
                      {/* Avatar */}
                      {showAvatar && !isMyMessage && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #64748b, #475569)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'white',
                          flexShrink: 0
                        }}>
                          {msg.senderAvatar}
                        </div>
                      )}
                      {!showAvatar && !isMyMessage && <div style={{ width: '32px' }} />}

                      {/* Mensaje */}
                      <div
                        style={{
                          maxWidth: '70%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          position: 'relative'
                        }}
                        onMouseEnter={e => {
                          const actions = e.currentTarget.querySelector('.message-actions') as HTMLElement
                          if (actions) actions.style.opacity = '1'
                        }}
                        onMouseLeave={e => {
                          const actions = e.currentTarget.querySelector('.message-actions') as HTMLElement
                          if (actions) actions.style.opacity = '0'
                        }}
                      >
                        {/* Nombre del emisor (en grupos) */}
                        {!isMyMessage && currentChatData?.isGroup && showAvatar && (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginLeft: '12px' }}>
                            {msg.senderName}
                          </span>
                        )}

                        {/* Mensaje de respuesta */}
                        {replyToMsg && (
                          <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            borderLeft: '3px solid #6366f1',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.6)'
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>{replyToMsg.senderName}</div>
                            <div style={{ opacity: 0.8 }}>{replyToMsg.content}</div>
                          </div>
                        )}

                        {/* Burbuja del mensaje */}
                        <div style={{
                          background: isMyMessage
                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                            : 'rgba(255,255,255,0.08)',
                          padding: '12px 16px',
                          borderRadius: isMyMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          color: isMyMessage ? 'white' : 'rgba(255,255,255,0.9)',
                          fontSize: '14px',
                          lineHeight: 1.5,
                          border: isMyMessage ? 'none' : '1px solid rgba(255,255,255,0.05)',
                          boxShadow: isMyMessage ? '0 4px 12px rgba(99,102,241,0.2)' : 'none',
                          wordWrap: 'break-word'
                        }}>
                          {/* Archivo/Imagen */}
                          {msg.type === 'image' && msg.fileUrl && (
                            <img
                              src={msg.fileUrl}
                              alt={msg.fileName}
                              style={{
                                maxWidth: '100%',
                                borderRadius: '12px',
                                marginBottom: '8px',
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(msg.fileUrl, '_blank')}
                            />
                          )}

                          {msg.type === 'file' && msg.fileUrl && (
                            <a
                              href={msg.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                color: 'inherit',
                                marginBottom: '8px'
                              }}
                            >
                              <Icons.Download />
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 500 }}>{msg.fileName}</div>
                                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                  {msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : ''}
                                </div>
                              </div>
                            </a>
                          )}

                          {/* Texto */}
                          <div>{msg.content}</div>

                          {/* Indicador de editado */}
                          {msg.edited && (
                            <span style={{ fontSize: '11px', opacity: 0.6, fontStyle: 'italic', marginLeft: '6px' }}>
                              (editado)
                            </span>
                          )}
                        </div>

                        {/* Reacciones */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div style={{
                            display: 'flex',
                            gap: '4px',
                            flexWrap: 'wrap',
                            marginTop: '4px',
                            marginLeft: isMyMessage ? 'auto' : '0'
                          }}>
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                              userIds.length > 0 && (
                                <div
                                  key={emoji}
                                  onClick={() => addReaction(msg.id, emoji)}
                                  style={{
                                    background: userIds.includes(user?.id || '')
                                      ? 'rgba(99,102,241,0.2)'
                                      : 'rgba(255,255,255,0.1)',
                                    border: `1px solid ${userIds.includes(user?.id || '') ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <span>{emoji}</span>
                                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                                    {userIds.length}
                                  </span>
                                </div>
                              )
                            ))}
                          </div>
                        )}

                        {/* Hora y estado de lectura */}
                        <div style={{
                          fontSize: '11px',
                          color: 'rgba(255,255,255,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '2px',
                          alignSelf: isMyMessage ? 'flex-end' : 'flex-start'
                        }}>
                          <span>{formatTime(msg.timestamp)}</span>
                          {isMyMessage && (
                            msg.readBy.length > 1 ? <Icons.CheckDouble /> : <Icons.Check />
                          )}
                        </div>

                        {/* Acciones del mensaje (hover) */}
                        <div
                          className="message-actions"
                          style={{
                            position: 'absolute',
                            top: '-12px',
                            [isMyMessage ? 'left' : 'right']: '12px',
                            background: '#1a1a24',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '4px',
                            display: 'flex',
                            gap: '2px',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            zIndex: 10
                          }}
                        >
                          {/* Emojis rápidos */}
                          {quickEmojis.slice(0, 3).map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(msg.id, emoji)}
                              style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '16px',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                              {emoji}
                            </button>
                          ))}
                          
                          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

                          {/* Más emojis */}
                          <button
                            onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255,255,255,0.6)',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            <Icons.Smile />
                          </button>

                          {/* Responder */}
                          <button
                            onClick={() => setReplyingTo(msg)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255,255,255,0.6)',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: '4px'
                            }}
                            title="Responder"
                          >
                            <Icons.Reply />
                          </button>

                          {/* Editar (solo mis mensajes de texto) */}
                          {isMyMessage && msg.type === 'text' && (
                            <button
                              onClick={() => {
                                setEditingMessage(msg)
                                setMessageText(msg.content)
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.6)',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                borderRadius: '4px'
                              }}
                              title="Editar"
                            >
                              <Icons.Edit />
                            </button>
                          )}

                          {/* Eliminar para mí */}
                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar este mensaje?')) {
                                deleteMessageForMe(msg.id)
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: '4px'
                            }}
                            title="Eliminar para mí"
                          >
                            <Icons.Trash />
                          </button>
                        </div>

                        {/* Selector de emojis expandido */}
                        {showEmojiPicker === msg.id && (
                          <div style={{
                            position: 'absolute',
                            top: '-48px',
                            [isMyMessage ? 'left' : 'right']: '0',
                            background: '#1a1a24',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '8px',
                            display: 'flex',
                            gap: '4px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            zIndex: 20
                          }}>
                            {quickEmojis.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(msg.id, emoji)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '20px',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Indicador de "está escribiendo" */}
            {typingUsers.filter(t => t.chatId === selectedChat.id && t.userId !== user?.id).length > 0 && (
              <div style={{ padding: '0 24px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                {typingUsers.filter(t => t.chatId === selectedChat.id && t.userId !== user?.id)[0].userName} está escribiendo...
              </div>
            )}

            {/* Respuesta activa */}
            {replyingTo && (
              <div style={{
                padding: '12px 24px',
                background: 'rgba(99,102,241,0.1)',
                borderTop: '1px solid rgba(99,102,241,0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600, marginBottom: '4px' }}>
                    Respondiendo a {replyingTo.senderName}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    {replyingTo.content.slice(0, 50)}{replyingTo.content.length > 50 ? '...' : ''}
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <Icons.X />
                </button>
              </div>
            )}

            {/* Edición activa */}
            {editingMessage && (
              <div style={{
                padding: '12px 24px',
                background: 'rgba(245,158,11,0.1)',
                borderTop: '1px solid rgba(245,158,11,0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600, marginBottom: '4px' }}>
                    Editando mensaje
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    {editingMessage.content.slice(0, 50)}{editingMessage.content.length > 50 ? '...' : ''}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingMessage(null)
                    setMessageText('')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <Icons.X />
                </button>
              </div>
            )}

            {/* Input de mensaje */}
            <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#1a1a24' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                {/* Botones de archivos */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'file')
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Adjuntar archivo"
                  >
                    <Icons.Paperclip />
                  </button>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'image')
                    }}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Enviar imagen"
                  >
                    <Icons.Image />
                  </button>
                </div>

                {/* Input de texto */}
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={uploading ? 'Subiendo archivo...' : 'Escribe un mensaje...'}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    color: 'white',
                    outline: 'none',
                    fontSize: '14px',
                    minHeight: '52px',
                    maxHeight: '120px',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />

                {/* Botón enviar */}
                <button
                  onClick={sendMessage}
                  disabled={(!messageText.trim() && !uploading) || uploading}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: (!messageText.trim() && !uploading)
                      ? 'rgba(99,102,241,0.3)'
                      : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    color: 'white',
                    cursor: (!messageText.trim() && !uploading) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: messageText.trim() ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Icons.Send />
                </button>
              </div>

              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                Presiona Enter para enviar, Shift+Enter para nueva línea
              </p>
            </div>
          </>
        )}
      </div>

      {/* ==================== MODAL: NUEVO CHAT DIRECTO ==================== */}
      {showNewChatModal && (
        <div
          onClick={() => setShowNewChatModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '500px',
              background: '#12121a',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '28px',
              maxHeight: '70vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>
                Nueva Conversación
              </h2>
              <button
                onClick={() => setShowNewChatModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <Icons.X />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => startDirectChat(u.id)}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.1)'
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  }}
                >
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'white'
                  }}>
                    {u.avatar || u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                      {u.department} • {u.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: NUEVO GRUPO ==================== */}
      {showNewGroupModal && (
        <div
          onClick={() => setShowNewGroupModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '600px',
              background: '#12121a',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '28px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>
                Crear Grupo
              </h2>
              <button
                onClick={() => setShowNewGroupModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <Icons.X />
              </button>
            </div>

            {/* Información del grupo */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                Nombre del grupo *
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Ej. Equipo de Marketing"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  marginBottom: '16px'
                }}
              />

              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                Descripción
              </label>
              <textarea
                value={newGroupDescription}
                onChange={e => setNewGroupDescription(e.target.value)}
                placeholder="Describe el propósito del grupo..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Selección de miembros */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', fontWeight: 500 }}>
                Agregar miembros ({selectedMembers.length})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {users.map(u => {
                  const isSelected = selectedMembers.includes(u.id)
                  
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedMembers(selectedMembers.filter(id => id !== u.id))
                        } else {
                          setSelectedMembers([...selectedMembers, u.id])
                        }
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'white'
                        }}>
                          {u.avatar || u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: 'white' }}>
                            {u.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                            {u.department}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{ color: '#818cf8' }}>
                          <Icons.Check />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Botón crear */}
            <button
              onClick={createGroup}
              disabled={!newGroupName.trim() || selectedMembers.length === 0}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: (!newGroupName.trim() || selectedMembers.length === 0)
                  ? 'rgba(99,102,241,0.3)'
                  : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: 'white',
                fontWeight: 700,
                fontSize: '15px',
                cursor: (!newGroupName.trim() || selectedMembers.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: (newGroupName.trim() && selectedMembers.length > 0) ? '0 8px 20px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              Crear Grupo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}