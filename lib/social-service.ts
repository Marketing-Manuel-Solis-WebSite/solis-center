import { db } from './firebase'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot
} from 'firebase/firestore'
import { SocialMessage, SocialPlatform } from '../types'

// ==================== CONFIGURACIÓN DE APIS ====================
// Configura estas variables en tu archivo .env.local
const API_CONFIG = {
  META_GRAPH_URL: process.env.NEXT_PUBLIC_META_GRAPH_URL || 'https://graph.facebook.com/v19.0',
  WHATSAPP_PHONE_ID: process.env.NEXT_PUBLIC_WHATSAPP_PHONE_ID,
  WHATSAPP_TOKEN: process.env.NEXT_PUBLIC_WHATSAPP_TOKEN,
  
  // Instagram (usa Graph API de Meta)
  INSTAGRAM_ACCOUNT_ID: process.env.NEXT_PUBLIC_INSTAGRAM_ACCOUNT_ID,
  INSTAGRAM_TOKEN: process.env.NEXT_PUBLIC_INSTAGRAM_TOKEN,
  
  // Facebook Messenger (usa Graph API de Meta)
  MESSENGER_PAGE_ID: process.env.NEXT_PUBLIC_MESSENGER_PAGE_ID,
  MESSENGER_TOKEN: process.env.NEXT_PUBLIC_MESSENGER_TOKEN,
  
  // TikTok
  TIKTOK_URL: 'https://open.tiktokapis.com/v2/message/send/',
  TIKTOK_TOKEN: process.env.NEXT_PUBLIC_TIKTOK_TOKEN,
}

export const socialService = {

  // ==================== 1. ESCUCHAR MENSAJES EN TIEMPO REAL ====================
  subscribeToMessages: (callback: (msgs: SocialMessage[]) => void) => {
    const q = query(collection(db, 'social_messages'), orderBy('timestamp', 'desc'))
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SocialMessage[]
      callback(messages)
    })
  },

  // ==================== 2. ENVIAR MENSAJE A API EXTERNA ====================
  sendMessage: async (platform: SocialPlatform, recipientId: string, text: string, user: any) => {
    try {
      let apiSuccess = false

      // A) Llamada a la API Real según la plataforma
      switch (platform) {
        case 'whatsapp':
          if (!API_CONFIG.WHATSAPP_PHONE_ID || !API_CONFIG.WHATSAPP_TOKEN) {
            throw new Error('Configuración de WhatsApp incompleta en .env.local')
          }
          
          const whatsappResponse = await fetch(
            `${API_CONFIG.META_GRAPH_URL}/${API_CONFIG.WHATSAPP_PHONE_ID}/messages`, 
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${API_CONFIG.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: recipientId,
                type: 'text',
                text: { body: text }
              })
            }
          )
          
          if (!whatsappResponse.ok) {
            const errorData = await whatsappResponse.json()
            console.error('Error WhatsApp API:', errorData)
            throw new Error('Fallo al enviar mensaje a WhatsApp API')
          }
          apiSuccess = true
          break

        case 'instagram':
          if (!API_CONFIG.INSTAGRAM_ACCOUNT_ID || !API_CONFIG.INSTAGRAM_TOKEN) {
            throw new Error('Configuración de Instagram incompleta en .env.local')
          }
          
          const igResponse = await fetch(
            `${API_CONFIG.META_GRAPH_URL}/${API_CONFIG.INSTAGRAM_ACCOUNT_ID}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${API_CONFIG.INSTAGRAM_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text }
              })
            }
          )
          
          if (!igResponse.ok) {
            const errorData = await igResponse.json()
            console.error('Error Instagram API:', errorData)
            throw new Error('Fallo al enviar mensaje a Instagram API')
          }
          apiSuccess = true
          break

        case 'messenger':
          if (!API_CONFIG.MESSENGER_PAGE_ID || !API_CONFIG.MESSENGER_TOKEN) {
            throw new Error('Configuración de Messenger incompleta en .env.local')
          }
          
          const messengerResponse = await fetch(
            `${API_CONFIG.META_GRAPH_URL}/${API_CONFIG.MESSENGER_PAGE_ID}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${API_CONFIG.MESSENGER_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text }
              })
            }
          )
          
          if (!messengerResponse.ok) {
            const errorData = await messengerResponse.json()
            console.error('Error Messenger API:', errorData)
            throw new Error('Fallo al enviar mensaje a Messenger API')
          }
          apiSuccess = true
          break

        case 'facebook':
          // Facebook Pages usa la misma API que Messenger
          if (!API_CONFIG.MESSENGER_PAGE_ID || !API_CONFIG.MESSENGER_TOKEN) {
            throw new Error('Configuración de Facebook incompleta en .env.local')
          }
          
          const fbResponse = await fetch(
            `${API_CONFIG.META_GRAPH_URL}/${API_CONFIG.MESSENGER_PAGE_ID}/feed`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${API_CONFIG.MESSENGER_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: text
              })
            }
          )
          
          if (!fbResponse.ok) {
            const errorData = await fbResponse.json()
            console.error('Error Facebook API:', errorData)
            throw new Error('Fallo al enviar mensaje a Facebook API')
          }
          apiSuccess = true
          break

        case 'tiktok':
          if (!API_CONFIG.TIKTOK_TOKEN) {
            throw new Error('Configuración de TikTok incompleta en .env.local')
          }
          
          const tiktokResponse = await fetch(API_CONFIG.TIKTOK_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${API_CONFIG.TIKTOK_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              recipient_id: recipientId,
              message: text
            })
          })
          
          if (!tiktokResponse.ok) {
            const errorData = await tiktokResponse.json()
            console.error('Error TikTok API:', errorData)
            throw new Error('Fallo al enviar mensaje a TikTok API')
          }
          apiSuccess = true
          break

        default:
          throw new Error(`Plataforma no soportada: ${platform}`)
      }

      // B) Solo guardar en Firestore si la API respondió OK
      if (apiSuccess) {
        await addDoc(collection(db, 'social_messages'), {
          platform,
          externalId: `out_${Date.now()}`,
          senderName: user.name || 'Agente Solis',
          senderHandle: 'Solis Center',
          senderAvatar: user.avatar || 'S',
          content: text,
          timestamp: serverTimestamp(),
          status: 'replied',
          direction: 'outgoing',
          threadId: recipientId
        })
      }
      
      return true
    } catch (error) {
      console.error('Error crítico enviando mensaje:', error)
      throw error
    }
  },

  // ==================== 3. MARCAR COMO LEÍDO ====================
  markAsRead: async (messageId: string) => {
    try {
      const msgRef = doc(db, 'social_messages', messageId)
      await updateDoc(msgRef, { status: 'read' })
    } catch (error) {
      console.error('Error marcando mensaje como leído:', error)
    }
  },

  // ==================== 4. ACTUALIZAR ESTADO DE MENSAJE ====================
  updateMessageStatus: async (messageId: string, newStatus: 'unread' | 'read' | 'replied' | 'resolved' | 'archived') => {
    try {
      const msgRef = doc(db, 'social_messages', messageId)
      await updateDoc(msgRef, { status: newStatus })
    } catch (error) {
      console.error('Error actualizando estado del mensaje:', error)
      throw error
    }
  },

  // ==================== 5. RECIBIR WEBHOOK (MENSAJES ENTRANTES) ====================
  /**
   * Este método debe ser llamado desde un endpoint API (por ejemplo /api/webhooks/social)
   * cuando las plataformas envían notificaciones de nuevos mensajes
   */
  handleIncomingWebhook: async (platform: SocialPlatform, webhookData: any) => {
    try {
      let messageData: Partial<SocialMessage> | null = null

      switch (platform) {
        case 'whatsapp':
          // Parsear webhook de WhatsApp Business API
          if (webhookData.object === 'whatsapp_business_account') {
            const entry = webhookData.entry?.[0]
            const change = entry?.changes?.[0]
            const message = change?.value?.messages?.[0]
            
            if (message) {
              messageData = {
                platform: 'whatsapp',
                externalId: message.id,
                senderName: change.value.contacts?.[0]?.profile?.name || 'Desconocido',
                senderHandle: message.from,
                content: message.text?.body || '',
                timestamp: serverTimestamp(),
                status: 'unread',
                direction: 'incoming',
                threadId: message.from
              }
            }
          }
          break

        case 'instagram':
        case 'messenger':
          // Parsear webhook de Instagram/Messenger (formato similar)
          if (webhookData.object === 'page' || webhookData.object === 'instagram') {
            const entry = webhookData.entry?.[0]
            const messaging = entry?.messaging?.[0]
            
            if (messaging?.message) {
              messageData = {
                platform,
                externalId: messaging.message.mid,
                senderName: messaging.sender.id,
                senderHandle: messaging.sender.id,
                content: messaging.message.text || '',
                timestamp: serverTimestamp(),
                status: 'unread',
                direction: 'incoming',
                threadId: messaging.sender.id
              }
            }
          }
          break

        case 'tiktok':
          // Parsear webhook de TikTok
          if (webhookData.event === 'message') {
            messageData = {
              platform: 'tiktok',
              externalId: webhookData.message_id,
              senderName: webhookData.sender.display_name || 'Usuario TikTok',
              senderHandle: webhookData.sender.id,
              content: webhookData.message.text || '',
              timestamp: serverTimestamp(),
              status: 'unread',
              direction: 'incoming',
              threadId: webhookData.conversation_id
            }
          }
          break
      }

      // Guardar mensaje en Firestore
      if (messageData) {
        await addDoc(collection(db, 'social_messages'), messageData)
        return true
      }

      return false
    } catch (error) {
      console.error('Error procesando webhook:', error)
      throw error
    }
  },

  // ==================== 6. ANÁLISIS DE SENTIMIENTO (OPCIONAL CON GEMINI) ====================
  analyzeSentiment: async (messageContent: string): Promise<'positive' | 'neutral' | 'negative'> => {
    // Aquí puedes integrar Gemini AI para análisis de sentimiento
    // Por ahora retornamos 'neutral' como placeholder
    return 'neutral'
  }
}