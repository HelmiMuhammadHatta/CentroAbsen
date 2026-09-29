import { useAuthStore } from '../store/authStore'

export const useAuth = () => {
  const { user, setAuth, clearAuth } = useAuthStore()
  const isAuthenticated = !!user
  
  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) ?? false
  }
  const hasRole = (role: string) => {
    return user?.role === role
  }

  return { isAuthenticated, user, hasPermission, hasRole, setAuth, clearAuth }
}
