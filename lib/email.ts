// lib/email.ts
// Servicio de notificaciones por correo usando EmailJS

interface EmailParams {
  to_email: string
  to_name: string
  task_title: string
  task_description: string
  task_priority: string
  task_due_date: string
  assigned_by: string
}

// Nueva interfaz para respuestas de formularios
interface FormEmailParams {
  to_email: string
  form_title: string
  submission_data: Record<string, any>
  respondent_name: string
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

export async function sendFormResponseNotification(params: FormEmailParams): Promise<boolean> {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_PUBLIC_KEY) {
    console.log('📧 Simulación Envío Formulario:')
    console.log(`   Para: ${params.to_email}`)
    console.log(`   Formulario: ${params.form_title}`)
    console.log(`   Datos:`, params.submission_data)
    return true
  }

  // Convertir objeto de datos a tabla HTML bonita
  const rows = Object.entries(params.submission_data).map(([key, value]) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">${key}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${value}</td>
    </tr>
  `).join('')

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0;">Nueva Respuesta: ${params.form_title}</h2>
        <p style="color: rgba(255,255,255,0.8); margin-top: 8px;">Enviado por: ${params.respondent_name}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; padding: 20px;">
        ${rows}
      </table>
      <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; background: #f8fafc;">
        Solis Center Forms
      </div>
    </div>
  `

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: params.to_email,
          subject: `Respuesta: ${params.form_title}`,
          message_html: htmlContent, 
          respondent: params.respondent_name
        },
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Error enviando email de formulario:', error)
    return false
  }
}