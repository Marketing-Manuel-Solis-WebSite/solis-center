import { SocialMessage } from '../types'

// ============================================================================
// SIMULACIÓN DE BASE DE DATOS Y CONEXIÓN A APIS EXTERNAS
// ============================================================================

// DATOS REALISTAS PARA UN DESPACHO LEGAL (Solis Center)
const MOCK_DB: SocialMessage[] = [
  { 
    id: 'msg_001', 
    platform: 'whatsapp', 
    senderName: 'Roberto Martínez', 
    senderHandle: '+52 55 8923 1234', 
    content: 'Hola, tuve un accidente en la I-45 ayer. La otra persona no tenía seguro y la policía ya me dio el reporte. ¿Me pueden ayudar con la demanda? Tengo fotos de los daños.', 
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // Hace 5 min
    status: 'unread', 
    senderAvatar: 'RM',
    intent: 'consulta_legal',
    leadScore: 95
  },
  { 
    id: 'msg_002', 
    platform: 'facebook', 
    senderName: 'Laura Elena García', 
    senderHandle: 'Laura García', 
    content: 'Buenas tardes. Vi su anuncio sobre casos de compensación laboral. Mi esposo se lastimó la espalda en una construcción en Houston y el jefe dice que no es su responsabilidad. ¿Cobran por la primera consulta?', 
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // Hace 45 min
    status: 'unread', 
    senderAvatar: 'LG',
    intent: 'consulta_legal',
    leadScore: 88
  },
  { 
    id: 'msg_003', 
    platform: 'instagram', 
    senderName: 'Javier.Mtz99', 
    senderHandle: '@javier_mtz_tx', 
    content: '¿Tienen oficinas en San Antonio? Necesito renovar mi DACA y no estoy seguro si califico para el nuevo proceso.', 
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // Hace 2 horas
    status: 'read', 
    senderAvatar: 'JM',
    intent: 'general',
    leadScore: 60
  },
  { 
    id: 'msg_004', 
    platform: 'tiktok', 
    senderName: 'User992834', 
    senderHandle: '@user992834', 
    content: 'Precio de la consulta para divorcio?', 
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Ayer
    status: 'replied', 
    senderAvatar: 'U',
    intent: 'precios',
    leadScore: 30
  },
  { 
    id: 'msg_005', 
    platform: 'messenger', 
    senderName: 'Patricia Solis', 
    senderHandle: 'Patricia Solis', 
    content: 'Ya envié los documentos que me pidió la abogada Ana por correo. ¿Me confirman si les llegaron? Es sobre el caso #4492-B', 
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // Ayer
    status: 'read', 
    senderAvatar: 'PS',
    intent: 'general',
    leadScore: 75
  },
  { 
    id: 'msg_006', 
    platform: 'whatsapp', 
    senderName: 'Ing. Carlos Vela', 
    senderHandle: '+1 210 555 0192', 
    content: 'Urgente: Migración detuvo a un empleado mío esta mañana. Necesito representación inmediata. ¿A quién contacto?', 
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // Hace 2 días
    status: 'replied', 
    senderAvatar: 'CV',
    intent: 'consulta_legal',
    leadScore: 99
  }
]

/**
 * SERVICIO DE MENSAJERÍA UNIFICADA
 * Aquí es donde integrarás las APIs reales (Twilio, Meta Graph API, TikTok API, etc.)
 */
export const socialService = {
  
  // 1. OBTENER MENSAJES (GET)
  // Conectar con: GET /api/messages o Webhooks de Twilio/Meta
  async getMessages(): Promise<SocialMessage[]> {
    // SIMULACIÓN DE RETRASO DE RED (API REAL)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...MOCK_DB])
      }, 800) 
    })

    // --- CÓDIGO PARA API REAL ---
    // const response = await fetch('https://tu-backend.com/api/social-inbox')
    // return await response.json()
  },

  // 2. ENVIAR RESPUESTA (POST)
  // Conectar con: POST /api/send-message (que a su vez llama a Twilio/Meta)
  async sendMessage(platform: string, recipientId: string, text: string): Promise<boolean> {
    console.log(`[API MOCK] Enviando a ${platform} (${recipientId}): ${text}`)
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 1000)
    })

    // --- CÓDIGO PARA API REAL ---
    // const response = await fetch('https://tu-backend.com/api/send', {
    //   method: 'POST',
    //   body: JSON.stringify({ platform, recipientId, text })
    // })
    // return response.ok
  },

  // 3. MARCAR COMO LEÍDO/RESUELTO
  async markAsRead(messageId: string): Promise<void> {
    console.log(`[API MOCK] Marcando mensaje ${messageId} como leído`)
    // Aquí actualizarías el estado en tu BD (Firebase/Postgres)
  }
}