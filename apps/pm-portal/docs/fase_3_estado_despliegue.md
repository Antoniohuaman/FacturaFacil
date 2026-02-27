# Fase 3: Estado de despliegue en Portal PM

## ¿Qué contiene estado.json?

Durante cada build del Portal PM se genera `public/estado.json` con estos campos:

- `aplicacion`: nombre de la app (`Portal PM`)
- `version`: tomada desde `package.json`
- `commit`: SHA del commit actual
- `rama`: rama de build
- `fechaConstruccion`: fecha y hora ISO de construcción
- `repositorioUrl`: URL del repositorio si está disponible
- `commitUrl`: enlace directo al commit (cuando se puede construir)

## ¿De dónde vienen los datos?

El script `scripts/generarEstadoDespliegue.mjs` usa esta prioridad:

1. Variables de Cloudflare Pages:
   - `CF_PAGES_COMMIT_SHA`
   - `CF_PAGES_BRANCH`
2. Fallback local (si no hay variables):
   - `git rev-parse HEAD`
   - `git rev-parse --abbrev-ref HEAD`
3. Fecha siempre desde `new Date().toISOString()`
4. Repositorio desde `package.json.repository` o `GITHUB_REPOSITORY`

No se usan secretos ni tokens privados.

## ¿Cómo se valida local vs Cloudflare?

### Local

1. Ejecutar `npm --prefix apps/pm-portal run build`
2. Verificar que exista `apps/pm-portal/public/estado.json` durante build y `dist/estado.json` al finalizar
3. Abrir el Tablero y confirmar que se muestra la tarjeta **Estado del despliegue**

### Cloudflare Pages

1. El build recibe variables `CF_PAGES_*`
2. El script genera `estado.json` con SHA/rama reales del despliegue
3. El Tablero refleja esos valores automáticamente

## ¿Qué se ve en el Tablero?

En `Tablero` se muestran:

- Tarjeta **Estado del despliegue** con versión, commit (link), rama, fecha y repositorio
- Tarjeta **Salud operativa** con:
  - estado de Auth (OK si hay sesión)
  - validación ligera de conexión a Supabase

Si falla la lectura de `estado.json`, se muestra error amigable sin romper el resto de la UI.
