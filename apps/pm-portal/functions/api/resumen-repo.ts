interface EntornoResumenRepo {
  GITHUB_TOKEN?: string
  GITHUB_OWNER?: string
  GITHUB_REPO?: string
}

interface CommitRepo {
  sha: string
  mensaje: string
  autor: string
  fecha: string
  url: string
}

interface RespuestaResumenRepo {
  fuente: 'github'
  disponible: boolean
  actualizado_en: string
  motivo_no_disponible: string | null
  total_commits_7d: number | null
  ultimos_commits: CommitRepo[]
}

type ContextoFunction = {
  env: EntornoResumenRepo
}

type CacheResumen = {
  expiraEn: number
  valor: RespuestaResumenRepo
}

const DURACION_CACHE_MS = 60_000

let cacheMemoria: CacheResumen | null = null

function construirRespuestaJson(status: number, cuerpo: RespuestaResumenRepo, cache: 'public, max-age=60' | 'no-store') {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache
    }
  })
}

function noDisponible(motivo: string): RespuestaResumenRepo {
  return {
    fuente: 'github',
    disponible: false,
    actualizado_en: new Date().toISOString(),
    motivo_no_disponible: motivo,
    total_commits_7d: null,
    ultimos_commits: []
  }
}

async function consultarGithub(url: string, token: string): Promise<Response> {
  return fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'portal-pm-cloudflare-function'
    }
  })
}

function toShaCorto(sha: string): string {
  return sha.slice(0, 8)
}

export const onRequestGet = async (context: ContextoFunction): Promise<Response> => {
  const ahora = Date.now()

  if (cacheMemoria && cacheMemoria.expiraEn > ahora) {
    return construirRespuestaJson(200, cacheMemoria.valor, 'public, max-age=60')
  }

  const owner = context.env.GITHUB_OWNER
  const repo = context.env.GITHUB_REPO
  const token = context.env.GITHUB_TOKEN

  if (!owner || !repo || !token) {
    return construirRespuestaJson(200, noDisponible('Faltan secretos de GitHub en Cloudflare Pages.'), 'no-store')
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const urlBase = `https://api.github.com/repos/${owner}/${repo}/commits`

  try {
    const [respuestaUltimos, respuestaSemana] = await Promise.all([
      consultarGithub(`${urlBase}?per_page=5`, token),
      consultarGithub(`${urlBase}?since=${encodeURIComponent(since)}&per_page=100`, token)
    ])

    if (!respuestaUltimos.ok || !respuestaSemana.ok) {
      throw new Error(`GitHub respondió ${respuestaUltimos.status}/${respuestaSemana.status}`)
    }

    const ultimosJson = (await respuestaUltimos.json()) as Array<{
      sha?: string
      html_url?: string
      commit?: {
        message?: string
        author?: {
          name?: string
          date?: string
        }
      }
    }>

    const semanaJson = (await respuestaSemana.json()) as unknown[]

    const ultimosCommits: CommitRepo[] = Array.isArray(ultimosJson)
      ? ultimosJson
          .filter((item) => typeof item.sha === 'string')
          .map((item) => ({
            sha: toShaCorto(item.sha ?? ''),
            mensaje: item.commit?.message?.split('\n')[0] ?? 'Sin mensaje',
            autor: item.commit?.author?.name ?? 'Desconocido',
            fecha: item.commit?.author?.date ?? 'Sin fecha',
            url: item.html_url ?? `https://github.com/${owner}/${repo}`
          }))
      : []

    const respuesta: RespuestaResumenRepo = {
      fuente: 'github',
      disponible: true,
      actualizado_en: new Date().toISOString(),
      motivo_no_disponible: null,
      total_commits_7d: Array.isArray(semanaJson) ? semanaJson.length : null,
      ultimos_commits: ultimosCommits
    }

    cacheMemoria = {
      expiraEn: ahora + DURACION_CACHE_MS,
      valor: respuesta
    }

    return construirRespuestaJson(200, respuesta, 'public, max-age=60')
  } catch (errorInterno) {
    return construirRespuestaJson(
      200,
      noDisponible(errorInterno instanceof Error ? errorInterno.message : 'No se pudo consultar GitHub.'),
      'no-store'
    )
  }
}
