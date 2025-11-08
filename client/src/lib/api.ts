import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
export const STORAGE_PUBLIC_URL_PREFIX = import.meta.env.VITE_STORAGE_PUBLIC_URL_PREFIX || ''

export const api = axios.create({ baseURL: API_BASE_URL })

export function imageUrlFromPath(path?: string | null) {
  if (!path) return undefined
  if (!STORAGE_PUBLIC_URL_PREFIX) return path
  return `${STORAGE_PUBLIC_URL_PREFIX.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}
