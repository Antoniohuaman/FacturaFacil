# Configuración de Login con Backend

## ✅ Cambios Realizados

### 1. **Tipos Actualizados** (`api.types.ts`)
Los tipos `UsuarioEmpresaResumen` y `EstablecimientoDTO` ahora coinciden **exactamente** con la estructura real del backend según `ayuda2.md`:

```typescript
interface UsuarioEmpresaResumen {
  id: string;
  empresaId: string;
  usuarioId: string;
  establecimientoId: string;
  empresaRuc: string;
  empresaRazonSocial: string;
  establecimientoCodigo: string;
  establecimientoNombre: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  esActivo: boolean;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EstablecimientoDTO {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  direccion: string;
  codigoDistrito: string;
  distrito: string;
  codigoProvincia: string;
  provincia: string;
  codigoDepartamento: string;
  departamento: string;
  codigoPostal: string;
  telefono: string | null;
  correo: string | null;
  esActivo: boolean;
  usuarioId: string;
  usuarioNombre: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2. **Endpoint de Login Configurado** (`AuthClient.ts`)
- **Endpoint**: `POST http://localhost:5242/api/v1/usuarios/login`
- **Body**: `{ email: string, password: string }`
- **Response**: Estructura exacta según backend real

### 3. **Variables de Entorno** (`.env`)
Creado archivo `.env` con configuración del backend:
```env
VITE_API_URL=http://localhost:5242
VITE_DEV_MODE=false
```

### 4. **Modo DEV Actualizado**
La simulación DEV ahora devuelve la estructura **exacta** del backend real para testing sin backend activo.

---

## 🚀 Cómo Usar

### **Opción 1: Conectar con Backend Real**

1. **Asegúrate que el backend esté corriendo** en `http://localhost:5242`
2. **Verifica el archivo `.env`**:
   ```env
   VITE_API_URL=http://localhost:5242
   VITE_DEV_MODE=false
   ```
3. **Reinicia el servidor de Vite** para que cargue las variables de entorno:
   ```bash
   npm run dev
   ```
4. **Prueba el login** con las credenciales del backend:
   ```
   Email: ycamposde@gmail.com
   Password: 12345678
   ```

### **Opción 2: Modo Desarrollo (Sin Backend)**

1. **Activa DEV_MODE** en `.env`:
   ```env
   VITE_API_URL=http://localhost:5242
   VITE_DEV_MODE=true
   ```
2. **Reinicia el servidor de Vite**
3. **Registra un usuario** desde `/auth/register`
4. **Login** con ese usuario

---

## 📡 Verificación de CORS

Si el backend devuelve errores de CORS, asegúrate que tenga configurado:

```csharp
// En el backend (Program.cs o Startup.cs)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

app.UseCors("AllowFrontend");
```

---

## 🔍 Flujo de Login Implementado

```
1. Usuario ingresa email + password en LoginPage
2. LoginForm → useAuth.login(credentials)
3. AuthRepository.login()
   ├─ AuthClient.login() → POST /api/v1/usuarios/login
   ├─ Backend devuelve: { data: { token, empresas[], establecimientos[] } }
   └─ AuthRepository.completeAuthentication()
      ├─ Guarda token en localStorage
      ├─ Guarda usuario en AuthStore
      ├─ TenantStore.setLoginData(empresas, establecimientos)
      │  └─ Aplica regla empresas[0] → empresaActiva
      │  └─ Match establecimientoId → establecimientoActivo
      └─ fetchEmpresa(empresaId) → GET /api/v1/empresas/{id}
         └─ TenantStore.setEmpresaCompleta(empresaDTO)
4. Redirige a "/" (dashboard)
5. ConfiguracionEmpresa carga → formulario lleno con datos del backend ✅
```

---

## 📋 Checklist de Verificación

Antes de probar, verifica:

- ✅ Backend corriendo en `http://localhost:5242`
- ✅ Endpoint `/api/v1/usuarios/login` funcional
- ✅ Endpoint `/api/v1/empresas/{id}` funcional
- ✅ CORS configurado para `http://localhost:5173`
- ✅ Archivo `.env` con `VITE_DEV_MODE=false`
- ✅ Servidor Vite reiniciado después de cambiar `.env`

---

## 🐛 Troubleshooting

### Error: "Network Error" o CORS
**Solución**: Verifica que el backend tenga CORS habilitado para `http://localhost:5173`

### Error: "Login failed"
**Solución**: Verifica las credenciales y que el endpoint `/api/v1/usuarios/login` esté funcionando

### Error: "Formulario vacío después del login"
**Solución**: Verifica que el endpoint `/api/v1/empresas/{id}` esté funcionando y devolviendo datos

### La página no carga las variables de entorno
**Solución**: **REINICIA el servidor de Vite**. Los cambios en `.env` requieren restart.

---

## 📝 Notas Importantes

1. **Cambios en `.env` requieren restart de Vite**
2. **El token se guarda en localStorage** con key `senciyo_auth_tokens`
3. **La empresa completa se carga automáticamente** después del login
4. **Al hacer F5/refresh**, la empresa se recarga desde el backend si no está en cache
5. **El formulario de Configuración de Empresa usa PRIORIDAD**:
   - 1º empresaCompleta del TenantStore (backend)
   - 2º company del ConfigurationContext (legacy)
   - 3º localStorage pending_company_data (onboarding)

---

## 🔐 Credenciales de Prueba

Según `ayuda2.md`, puedes usar:
```
Email: ycamposde@gmail.com
Password: 12345678
```

**Nota**: Al hacer login con estas credenciales, el backend indica `requiereCambioPassword: true`. Si el frontend debe manejar este flujo, se debe implementar la redirección a cambio de contraseña.
