export { LoginForm } from './ui/login-form'
export { ChangePasswordForm } from './ui/change-password-form'
export { UserMenu, UserInfo } from './ui/user-menu'
export { Header } from './ui/header'
/**
 * Публичное API фичи auth: серверная сессия живёт в shared/api/session-server
 * (чтобы другие features не импортировали этот slice напрямую — FSD).
 */
export { getCurrentUser, getCurrentUserSafe, requireUser } from '@/shared/api'
export {
  loginAction,
  logoutAction,
  changePasswordAction,
  type LoginState,
  type ChangePasswordState,
} from './api/actions'
