// ========== SUPABASE - BARREL EXPORT ==========
// Importe tudo de um único lugar:
// import { supabase, signIn, uploadFile } from '../lib/supabase'

// Cliente público (frontend)
// ⚠️ NOTA: supabaseAdmin (secret key) NÃO é exportado aqui.
// Ele é usado apenas em Edge Functions / backend, fora do bundle do navegador.
export { supabase } from './client'

// Configuração pública (segura para o frontend)
// ⚠️ A SUPABASE_SECRET_KEY não é exportada para não vazar no bundle.
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_JWKS_URL } from '../../config/supabase'

// Autenticação
export {
  signUp,
  signIn,
  resendConfirmationEmail,
  signInWithProvider,
  signInWithMagicLink,
  signOut,
  getSession,
  getCurrentUser,
  resetPassword,
  updatePassword,
  onAuthStateChange,
  getProfile,
  updateProfile,
} from './auth'
export type { UserProfile } from './auth'

// Storage
export {
  listBuckets,
  createBucket,
  uploadFile,
  downloadFile,
  deleteFile,
  getPublicUrl,
  createSignedUrl,
  listFiles,
  moveFile,
  copyFile,
  uploadEventCover,
} from './storage'

// Banco de dados
export {
  fetchAll,
  fetchWithFilter,
  fetchById,
  insertRecord,
  updateRecord,
  deleteRecord,
  subscribeToTable,
  // Events
  fetchUserEvents,
  fetchEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  // Guests
  fetchGuestsByEvent,
  createGuest,
  createGuests,
  updateGuest,
  deleteGuest,
  fetchGuestGroups,
  createGuestGroup,
  updateGuestGroup,
  deleteGuestGroup,
  fetchCompanionsByGuest,
  createCompanion,
  updateCompanion,
  deleteCompanion,
  fetchVotesByGuest,
  upsertVote,
  deleteMyVote,
  fetchCommentsByGuest,
  createComment,
  deleteComment,
  fetchMyPermissions,
  fetchEventMembers,
  updateMemberPermissions,
  setGuestPriority,
  // Vendors
  fetchVendorsByEvent,
  createVendor,
  updateVendor,
  deleteVendor,
  // Tasks
  fetchTasksByEvent,
  createTask,
  updateTask,
  deleteTask,
  // Expenses
  fetchExpensesByEvent,
  createExpense,
  updateExpense,
  deleteExpense,
  // Gift Registry
  fetchGiftRegistryByEvent,
  createGiftRegistryItem,
  updateGiftRegistryItem,
  deleteGiftRegistryItem,
} from './database'
export type { QueryResult, QueryListResult, QueryOptions } from './database'

// Tipos
export type {
  User,
  Session,
  Profile,
  Event,
  EventType,
  ThemePreset,
  EventStatus,
  RsvpStatus,
  VendorStatus,
  TaskPriority,
  UserRole,
  Guest,
  GuestGroup,
  GuestCompanion,
  GuestVote,
  GuestVoteValue,
  GuestComment,
  CompanionRelationship,
  GuestPriority,
  EventMember,
  Vendor,
  Task,
  Expense,
  GiftRegistryItem,
  EventInsert,
  EventUpdate,
  GuestInsert,
  GuestGroupInsert,
  GuestCompanionInsert,
  GuestCommentInsert,
  VendorInsert,
  TaskInsert,
  ExpenseInsert,
  GiftRegistryItemInsert,
  Database,
} from './types'
