// lib/email.ts
// Servicio de notificaciones por correo usando EmailJS
// 
// CONFIGURACIÓN:
// 1. Ve a https://www.emailjs.com/ y crea una cuenta gratis
// 2. Agrega un servicio de email (Gmail, Outlook, etc.)
// 3. Crea un template con estas variables:
//    - {{to_name}} - Nombre del destinatario
//    - {{to_email}} - Email del destinatario  
//    - {{task_title}} - Título de la tarea
//    - {{task_description}} - Descripción
//    - {{task_priority}} - Prioridad
//    - {{task_due_date}} - Fecha límite
//    - {{assigned_by}} - Quien asignó la tarea
// 4. Copia tus credenciales al .env.local

interface EmailParams {
  to_email: string
  to_name: string
  task_title: string
  task_description: string
  task_priority: string
  task_due_date: string
  assigned_by: string
}

// Credenciales de EmailJS (ponlas en .env.local)
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || ''
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || ''
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''

export async function sendTaskNotification(params: EmailParams): Promise<boolean> {
  // Si no hay credenciales configuradas, solo loguear
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.log('📧 Notificación de email (simulada - configura EmailJS):')
    console.log(`   Para: ${params.to_name} <${params.to_email}>`)
    console.log(`   Tarea: ${params.task_title}`)
    console.log(`   Asignada por: ${params.assigned_by}`)
    return true
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: params.to_email,
          to_name: params.to_name,
          task_title: params.task_title,
          task_description: params.task_description,
          task_priority: params.task_priority,
          task_due_date: params.task_due_date,
          assigned_by: params.assigned_by,
          app_name: 'Solis Center',
        },
      }),
    })

    if (response.ok) {
      console.log('✅ Email enviado a:', params.to_email)
      return true
    } else {
      const error = await response.text()
      console.error('❌ Error enviando email:', error)
      return false
    }
  } catch (error) {
    console.error('❌ Error de red enviando email:', error)
    return false
  }
}

// Función alternativa usando Resend (si prefieres usar Resend en lugar de EmailJS)
// Requiere un endpoint de API en tu backend
export async function sendTaskNotificationResend(params: EmailParams): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
  
  if (!RESEND_API_KEY) {
    console.log('📧 Notificación de email (simulada - configura Resend):')
    console.log(`   Para: ${params.to_name} <${params.to_email}>`)
    return true
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Solis Center <noreply@tudominio.com>',
        to: [params.to_email],
        subject: `Nueva tarea asignada: ${params.task_title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">⚡ Solis Center</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
              <h2 style="color: #1e293b; margin-top: 0;">Hola ${params.to_name},</h2>
              <p style="color: #475569;">Se te ha asignado una nueva tarea:</p>
              
              <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <h3 style="color: #1e293b; margin-top: 0;">${params.task_title}</h3>
                <p style="color: #64748b;">${params.task_description}</p>
                
                <table style="width: 100%; margin-top: 15px;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Prioridad:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${params.task_priority}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Fecha límite:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${params.task_due_date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Asignada por:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${params.assigned_by}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">
                Ingresa a Solis Center para ver los detalles y comenzar a trabajar en esta tarea.
              </p>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
              © ${new Date().getFullYear()} Solis Center - Manuel Solis Law Firm
            </div>
          </div>
        `,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Error enviando email con Resend:', error)
    return false
  }
}