import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
) => {
  await transporter.sendMail({
    from: `"Clarity" <${process.env.MAIL_USER}>`,
    to,
    subject,
    text,
    html,
  })
}

export const sendTaskAssignedEmail = async (
  userEmail: string,
  taskTitle: string,
  dueDate?: string
) => {
  await sendEmail(
    userEmail,
    'Nouvelle tâche attribuée',
    `Bonjour,

Une nouvelle tâche vous a été attribuée : "${taskTitle}".

${
  dueDate
    ? `Date d'échéance : ${dueDate}\n\n`
    : ''
}Veuillez vous connecter pour voir les détails.

Cordialement,
L'équipe Task Manager`
  )
}