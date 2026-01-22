import { NextRequest, NextResponse } from 'next/server'
import { socialService } from '../../../../lib/social-service'

// ==================== CONFIGURACIÓN ====================
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'mi_token_secreto_123'

// ==================== GET: VERIFICACIÓN DE WEBHOOK ====================
// Meta (WhatsApp, Instagram, Messenger) requiere verificación GET
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verificar que el token coincida
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado correctamente')
    return new NextResponse(challenge, { status: 200 })
  }

  console.log('❌ Fallo en verificación de webhook')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ==================== POST: RECIBIR MENSAJES ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📩 Webhook recibido:', JSON.stringify(body, null, 2))

    // Determinar plataforma por el objeto del webhook
    let platform: 'whatsapp' | 'instagram' | 'messenger' | 'facebook' | 'tiktok' | null = null

    if (body.object === 'whatsapp_business_account') {
      platform = 'whatsapp'
    } else if (body.object === 'instagram') {
      platform = 'instagram'
    } else if (body.object === 'page') {
      // Facebook Messenger usa 'page'
      platform = 'messenger'
    } else if (body.event === 'message' && body.sender) {
      // TikTok usa estructura diferente
      platform = 'tiktok'
    }

    if (!platform) {
      console.log('⚠️ Plataforma no reconocida')
      return NextResponse.json({ status: 'ignored' }, { status: 200 })
    }

    // Procesar el mensaje con el servicio social
    const success = await socialService.handleIncomingWebhook(platform, body)

    if (success) {
      console.log(`✅ Mensaje de ${platform} guardado exitosamente`)
    } else {
      console.log(`⚠️ No se pudo procesar el mensaje de ${platform}`)
    }

    // Siempre responder 200 OK para evitar reintentos
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    console.error('❌ Error procesando webhook:', error)
    // Aún así responder 200 para evitar reintentos infinitos
    return NextResponse.json({ status: 'error' }, { status: 200 })
  }
}

// ==================== CONFIGURACIÓN DE NEXT.JS ====================
export const runtime = 'edge' // Opcional: usar edge runtime para mejor rendimiento