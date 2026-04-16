export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const formData = new URLSearchParams()
  formData.append('secret', config.turnstileSecret)
  formData.append('response', body.token)

  const verify: any = await $fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: formData
    }
  )

  if (!verify.success) {
    console.error('TURNSTILE VERIFY ERROR =>', verify)

    throw createError({
      statusCode: 400,
      message: 'Validation de sécurité échouée'
    })
  }

  return { success: true }
})