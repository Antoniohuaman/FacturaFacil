import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const raizPortal = resolve(import.meta.dirname, '..')
const rutaPackageJson = resolve(raizPortal, 'package.json')
const rutaEstadoJson = resolve(raizPortal, 'public', 'estado.json')

function leerPackageJson() {
  const contenido = readFileSync(rutaPackageJson, 'utf8')
  return JSON.parse(contenido)
}

function ejecutarGit(comando) {
  try {
    return execSync(comando, {
      cwd: raizPortal,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function obtenerRepositorioUrl(packageJson) {
  const repositorio = packageJson.repository

  if (typeof repositorio === 'string' && repositorio.trim()) {
    return repositorio.trim().replace(/^git\+/, '').replace(/\.git$/, '')
  }

  if (repositorio && typeof repositorio === 'object' && typeof repositorio.url === 'string') {
    return repositorio.url.trim().replace(/^git\+/, '').replace(/\.git$/, '')
  }

  const githubRepository = process.env.GITHUB_REPOSITORY?.trim()
  if (githubRepository) {
    return `https://github.com/${githubRepository}`
  }

  return null
}

function construirCommitUrl(repositorioUrl, commit) {
  if (!repositorioUrl || !commit) {
    return null
  }

  if (repositorioUrl.includes('github.com')) {
    return `${repositorioUrl.replace(/\/$/, '')}/commit/${commit}`
  }

  return null
}

const packageJson = leerPackageJson()
const commit = process.env.CF_PAGES_COMMIT_SHA?.trim() || ejecutarGit('git rev-parse HEAD') || null
const rama = process.env.CF_PAGES_BRANCH?.trim() || ejecutarGit('git rev-parse --abbrev-ref HEAD') || 'desconocida'
const fechaConstruccion = new Date().toISOString()
const repositorioUrl = obtenerRepositorioUrl(packageJson)
const commitUrl = construirCommitUrl(repositorioUrl, commit)

const estadoDespliegue = {
  aplicacion: 'Portal PM',
  version: packageJson.version ?? '0.0.0',
  commit,
  rama,
  fechaConstruccion,
  repositorioUrl,
  commitUrl
}

writeFileSync(rutaEstadoJson, `${JSON.stringify(estadoDespliegue, null, 2)}\n`, 'utf8')
console.log(`Estado de despliegue generado en ${rutaEstadoJson}`)
