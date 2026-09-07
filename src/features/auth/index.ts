export { LoginForm } from './ui/login-form'
export { ChangePasswordForm } from './ui/change-password-form'
export { UserMenu } from './ui/user-menu'
/**
 * Публичное API фичи auth: серверная сессия живёт в shared/api/session-server
 * (чтобы другие features не импортировали этот slice напрямую — FSD).
 */
export { getCurrentUser, requireUser } from '@/shared/api'
export {
  loginAction,
  logoutAction,
  changePasswordAction,
  type LoginState,
  type ChangePasswordState,
} from './api/actions'
