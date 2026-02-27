import type { RolUsuario } from '@/dominio/modelos'

export function puedeEditar(rol: RolUsuario | null) {
  return rol === 'editor' || rol === 'admin'
}

export function puedeAdministrar(rol: RolUsuario | null) {
  return rol === 'admin'
}
