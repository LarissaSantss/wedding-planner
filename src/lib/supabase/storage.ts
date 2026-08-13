import { supabase } from './client'

// ========== STORAGE (ARQUIVOS) ==========

/**
 * Lista os buckets disponíveis
 */
export async function listBuckets() {
  const { data, error } = await supabase.storage.listBuckets()
  return { data, error }
}

/**
 * Cria um novo bucket
 */
export async function createBucket(bucketName: string, isPublic = false) {
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: isPublic,
  })
  return { data, error }
}

/**
 * Faz upload de um arquivo para o bucket
 */
export async function uploadFile(
  bucketName: string,
  path: string,
  file: File | Blob,
  options?: { contentType?: string; upsert?: boolean },
) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    })
  return { data, error }
}

/**
 * Faz download de um arquivo do bucket
 */
export async function downloadFile(bucketName: string, path: string) {
  const { data, error } = await supabase.storage.from(bucketName).download(path)
  return { data, error }
}

/**
 * Remove um arquivo do bucket
 */
export async function deleteFile(bucketName: string, paths: string[]) {
  const { data, error } = await supabase.storage.from(bucketName).remove(paths)
  return { data, error }
}

/**
 * Gera a URL pública de um arquivo
 */
export function getPublicUrl(bucketName: string, path: string): string {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Gera uma URL assinada para acesso temporário (arquivos privados)
 */
export async function createSignedUrl(
  bucketName: string,
  path: string,
  expiresIn = 3600, // 1 hora em segundos
) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn)
  return { data, error }
}

/**
 * Lista arquivos de uma pasta no bucket
 */
export async function listFiles(bucketName: string, folderPath?: string) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(folderPath)
  return { data, error }
}

/**
 * Move um arquivo dentro do bucket
 */
export async function moveFile(bucketName: string, fromPath: string, toPath: string) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .move(fromPath, toPath)
  return { data, error }
}

/**
 * Copia um arquivo dentro do bucket
 */
export async function copyFile(bucketName: string, fromPath: string, toPath: string) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .copy(fromPath, toPath)
  return { data, error }
}

/**
 * Faz upload de um anexo de tarefa para o bucket privado
 * `task-attachments` e retorna o caminho do arquivo.
 */
export async function uploadTaskFile(
  taskId: string,
  file: File,
): Promise<{ path: string | null; error: Error | null }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${taskId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from('task-attachments').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    return { path: null, error: new Error(String(error)) }
  }
  return { path, error: null }
}

/**
 * Faz upload da foto de capa/perfil de um evento para o bucket público
 * `wedding-photos` e retorna a URL pública.
 *
 * Uso:
 *   const { url, error } = await uploadEventCover(eventId, file)
 */
export async function uploadEventCover(
  eventId: string,
  file: File | Blob,
): Promise<{ url: string | null; error: Error | null }> {
  const ext = file instanceof File && file.name.includes('.')
    ? file.name.split('.').pop()
    : 'jpg'
  const path = `${eventId}/cover.${ext}`
  const { error } = await supabase.storage.from('wedding-photos').upload(path, file, {
    upsert: true,
    contentType: file instanceof File ? file.type : undefined,
  })
  if (error) {
    return { url: null, error: new Error(String(error)) }
  }
  return { url: getPublicUrl('wedding-photos', path), error: null }
}
