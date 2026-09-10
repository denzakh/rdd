'use server'

/**
 * Server Actions управления пользователями (docs/spec-stage-3.md §5–6).
 * Каждое действие: requireUser() + проверка role=admin НА СЕРВЕРЕ
 * + запись в audit_log. Self-защита: нельзя понизить/заблокировать
 * последнего admin (в т.ч. себя).
 */
import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  createAuditRepository,
  createSession,
  getDb,
  requireUser,
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
} from '@/shared/api'
import { generatePassword, hashPassword, MIN_PASSWORD_LENGTH } from '@/shared/lib/password'
import {
  auditUser,
  auditUserEntry,
  changeDataScope,
  changeRole,
  countAdmins,
  createUser,
  findUserById,
  isEmailTaken,
  listUsers,
  resetPassword,
  setLock,
  ROLES,
  DATA_SCOPES,
  type AdminUser,
} from '../model/user-repo'
import {
  createInvite,
  findValidInvite,
  listActiveInvites,
  markInviteUsedStatement,
  revokeInvite,
} from '../model/invite-repo'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Доступ только у admin (серверная проверка, не только скрытие UI). */
async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'admin') redirect('/patients')
  return user
}

const revalidateUsers = (): void => revalidatePath('/admin/users')

// --- списки для страницы /admin/users ---

export async function getUsers(): Promise<AdminUser[]> {
  await requireAdmin()
  return listUsers(await getDb())
}

export async function getActiveInvites() {
  await requireAdmin()
  return listActiveInvites(await getDb())
}

// --- создание пользователя (пароль показывается один раз) ---

export interface CreateUserState {
  error?: string
  password?: string
  email?: string
}

export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const admin = await requireAdmin()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const displayName = String(formData.get('name') ?? '').trim()
  const role = String(formData.get('role') ?? 'clinician')
  const dataScope = String(formData.get('data_scope') ?? 'all')
  const siteId = String(formData.get('site_id') ?? '').trim()

  if (!EMAIL_RE.test(email)) return { error: 'Некорректный email' }
  if (!displayName) return { error: 'Укажите имя' }
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { error: 'Неизвестная роль' }
  if (!DATA_SCOPES.includes(dataScope as (typeof DATA_SCOPES)[number])) {
    return { error: 'Неизвестный вид доступа' }
  }
  if (dataScope === 'site' && !siteId) {
    return { error: 'Для доступа "свой центр" укажите код центра' }
  }

  const db = await getDb()
  if (await isEmailTaken(db, email)) return { error: 'Пользователь с таким email уже есть' }

  const password = generatePassword()
  const id = await createUser(db, {
    email,
    displayName,
    role: role as AdminUser['role'],
    dataScope: dataScope as AdminUser['dataScope'],
    siteId: dataScope === 'site' ? siteId : null,
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
  })
  await auditUser(db, admin.id, 'user_created', id, { email, role, dataScope })

  revalidateUsers()
  return { password, email }
}

// --- self-защита: нельзя лишить систему последнего admin / тронуть себя-admin ---

async function guardRoleChange(
  db: D1Database,
  actorId: string,
  target: AdminUser
): Promise<string | null> {
  if (target.role === 'admin' && (await countAdmins(db)) <= 1) {
    return 'Нельзя понизить или заблокировать последнего администратора'
  }
  if (target.id === actorId && target.role === 'admin') {
    return 'Нельзя изменить собственную роль или заблокировать себя'
  }
  return null
}

// --- роль / блокировка (простые form-actions) ---

export async function changeRoleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const role = String(formData.get('role') ?? '')
  if (!ROLES.includes(role as (typeof ROLES)[number])) return

  const db = await getDb()
  const target = await findUserById(db, id)
  if (!target || target.role === role) return
  if (await guardRoleChange(db, admin.id, target)) return

  await changeRole(db, id, role as AdminUser['role'])
  await auditUser(db, admin.id, 'role_changed', id, { from: target.role, to: role })
  revalidateUsers()
}

/** Переключатель видимости: "видит всех / свой центр / только назначенных". */
export async function changeDataScopeAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const dataScope = String(formData.get('data_scope') ?? 'all')
  const siteId = String(formData.get('site_id') ?? '').trim()
  if (!DATA_SCOPES.includes(dataScope as (typeof DATA_SCOPES)[number])) return
  if (dataScope === 'site' && !siteId) return // без центра фильтр "свой центр" пуст

  const db = await getDb()
  const target = await findUserById(db, id)
  if (!target) return

  await changeDataScope(db, id, dataScope as AdminUser['dataScope'], siteId || null)
  await auditUser(db, admin.id, 'data_scope_changed', id, {
    from: target.dataScope,
    to: dataScope,
    siteId: siteId || null,
  })
  revalidateUsers()
}

export async function lockUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const db = await getDb()
  const target = await findUserById(db, id)
  if (!target) return
  if (await guardRoleChange(db, admin.id, target)) return

  await setLock(db, id, new Date(Date.now() + 365 * 24 * 3600_000).toISOString())
  await auditUser(db, admin.id, 'user_locked', id)
  revalidateUsers()
}

export async function unlockUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const db = await getDb()
  await setLock(db, id, null)
  await auditUser(db, admin.id, 'user_unlocked', id)
  revalidateUsers()
}

// --- сброс пароля (генерация + must_change_password=1) ---

export interface ResetPasswordState {
  error?: string
  password?: string
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const admin = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const db = await getDb()
  const target = await findUserById(db, id)
  if (!target) return { error: 'Пользователь не найден' }
  if (target.role === 'admin' && (await countAdmins(db)) <= 1) {
    return { error: 'Нельзя сбросить пароль последнего администратора' }
  }

  const password = generatePassword()
  await resetPassword(db, id, await hashPassword(password))
  await auditUser(db, admin.id, 'password_reset', id)

  revalidateUsers()
  return { password }
}

// --- инвайты (docs/spec-stage-3.md §6) ---

export interface CreateInviteState {
  error?: string
  link?: string
}

export async function createInviteAction(
  _prev: CreateInviteState,
  formData: FormData
): Promise<CreateInviteState> {
  const admin = await requireAdmin()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const role = String(formData.get('role') ?? 'clinician')

  if (!EMAIL_RE.test(email)) return { error: 'Некорректный email' }
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { error: 'Неизвестная роль' }

  const db = await getDb()
  if (await isEmailTaken(db, email)) return { error: 'Пользователь с таким email уже есть' }

  const token = await createInvite(db, email, role as 'clinician', admin.id)
  await auditUser(db, admin.id, 'invite_created', email, { role })

  revalidateUsers()
  return { link: `/invite/${token}` }
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const db = await getDb()
  await revokeInvite(db, id)
  await auditUser(db, admin.id, 'invite_revoked', id)
  revalidateUsers()
}

// --- приём инвайта (страница /invite/<token>) ---

export interface AcceptInviteState {
  error?: string
}

export async function acceptInviteAction(
  _prev: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  const token = String(formData.get('token') ?? '')
  const displayName = String(formData.get('name') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const repeat = String(formData.get('repeat') ?? '')

  if (!displayName) return { error: 'Укажите имя' }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов` }
  }
  if (password !== repeat) return { error: 'Пароли не совпадают' }

  const db = await getDb()
  const invite = await findValidInvite(db, token)
  if (!invite) return { error: 'Ссылка недействительна или устарела' }
  if (await isEmailTaken(db, invite.email)) {
    return { error: 'Пользователь с таким email уже зарегистрирован' }
  }

  const userId = await createUser(db, {
    email: invite.email,
    displayName,
    role: invite.role,
    passwordHash: await hashPassword(password),
  })
  // used_at + аудит — одним батчем с уже созданным пользователем
  // (hash-chain достраивается через insertStatements, docs/threat-model.md §2 R)
  await db.batch([
    markInviteUsedStatement(db, invite.id),
    ...(await createAuditRepository(db).insertStatements([
      auditUserEntry(userId, 'invite_accepted', userId, { email: invite.email, role: invite.role }),
    ])),
  ])

  // авто-логин
  const sessionToken = await createSession(
    db,
    userId,
    (await headers()).get('user-agent') ?? undefined
  )
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 3600,
  })
  redirect('/patients')
}
