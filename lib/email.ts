interface EmailParams {
  to_email: string
  to_name: string
  task_title: string
  task_description: string
  task_priority: string
  task_due_date: string
  assigned_by: string
}

interface FormEmailParams {
  to_email: string
  form_title: string
  submission_data: Record<string, any>
  respondent_name: string
}

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || ''
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || ''
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''

export async function sendTaskNotification(params: EmailParams): Promise<boolean> {
  if (!EMAILJS_SERVICE_ID) {
    console.warn('EmailJS no configurado. El correo no se enviará.')
    return false
  }

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
    return response.ok
  } catch (error) {
    console.error('Error enviando email:', error)
    return false
  }
}

export async function sendFormResponseNotification(params: FormEmailParams): Promise<boolean> {
  if (!EMAILJS_SERVICE_ID) return false

  const rows = Object.entries(params.submission_data).map(([key, value]) => `
    <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">${key}</td><td style="padding:8px;border-bottom:1px solid #ddd;">${value}</td></tr>
  `).join('')

  const htmlContent = `
    <div style="font-family:sans-serif;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <div style="background:#6366f1;padding:20px;color:white;text-align:center;"><h2>${params.form_title}</h2></div>
      <table style="width:100%;padding:20px;">${rows}</table>
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
          subject: `Nueva Respuesta: ${params.form_title}`,
          message_html: htmlContent,
          respondent: params.respondent_name
        },
      }),
    })
    return response.ok
  } catch (error) {
    console.error('Error enviando email:', error)
    return false
  }
}