import { useAuth } from '~~/composables/useAuth'
export default defineNuxtRouteMiddleware((to) => {
  const { session } = useAuth()

  const isLoggedIn = !!session.value

  const publicPages = ['/auth/login']

  if (!isLoggedIn && !publicPages.includes(to.path)) {
    return navigateTo('/auth/login')
  }

  if (isLoggedIn && to.path === '/auth/login') {
    return navigateTo('/')
  }
})