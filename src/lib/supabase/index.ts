// ========== SUPABASE - BARREL EXPORT ==========
// Importe tudo de um único lugar:
// import { supabase, signIn, uploadFile } from '../lib/supabase'

// Cliente
export { supabase, supabaseAdmin } from './client'

// Configuração
export {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY,
  SUPABASE_JWKS_URL,
} from '../../config/supabase'

// Autenticação
export {
  signUp,
  signIn,
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
} from './database'

// Tipos
export type {
  User,
  Session,
  Profile,
  Wedding,
  Guest,
  Vendor,
  Task,
  Expense,
  GiftRegistryItem,
  Database,
} from './types'