# CONFIGURACION DEL SISTEMA - Checklist

## Dashboard de Configuracion
- [ ] Progreso general de configuracion
- [ ] Contador de modulos completados
- [ ] Estadistica de establecimientos creados
- [ ] Ambiente SUNAT (Prueba / Produccion)
- [ ] Accesos rapidos a:
  - [ ] Datos de Empresa
  - [ ] Establecimientos
  - [ ] Almacenes
  - [ ] Series de Comprobantes
  - [ ] Configuracion de Negocio
  - [ ] Usuarios y Roles
  - [ ] Cajas
  - [ ] Diseno de Comprobantes

---

## Datos de Empresa
- [ ] Validar RUC con SUNAT (RucValidator)
- [ ] Cargar automaticamente razon social y domicilio fiscal
- [ ] Razon social (solo lectura desde SUNAT)
- [ ] Nombre comercial
- [ ] Domicilio fiscal
- [*] Codigo ubigeo
- [ ] Moneda base (PEN / USD)
- [ ] Ambiente SUNAT
  - [ ] Modo Prueba (TEST)
  - [ ] Modo Produccion (PRODUCTION) con confirmacion (ConfirmationModal)
- [ ] Telefonos (lista dinamica)
- [ ] Correos electronicos (lista dinamica)
- [ ] Actividad economica
- [ ] Guardar configuracion de empresa
- [ ] Onboarding automatico (cuando es nueva empresa)
  - [ ] Crear establecimiento principal por defecto
  - [ ] Crear almacen principal por defecto
  - [ ] Crear series por defecto (Factura FE01, Boleta BE01)
  - [ ] Configurar monedas por defecto (PEN y USD)
  - [ ] Configurar impuestos por defecto (IGV 18%, IGV 10%, exonerados, etc.)
  - [ ] Crear / asociar caja "Caja 1" y autorizar usuario actual

---

## Establecimientos
- [*] Listado de establecimientos
- [*] Busqueda por codigo / nombre / direccion
- [*] Filtro por estado (todos / activos / inactivos)
- [*] Crear nuevo establecimiento
  - [*] Codigo
  - [*] Nombre
  - [*] Direccion
  - [*] Departamento / Provincia / Distrito (ubigeo cascada)
  - [*] Codigo postal
  - [*] Telefono / correo
- [*] Editar establecimiento existente
- [*] Validaciones (codigos unicos, obligatorios, email valido)
- [*] Eliminar establecimiento (confirmacion)
- [*] Feedback con toasts (exito / error)

---

## Almacenes
- [*] Listado de almacenes por establecimiento
- [*] Filtro por establecimiento
- [*] Filtro por estado (activo / inactivo)
- [*] Busqueda por nombre / codigo / establecimiento
- [*] Estadisticas
  - [*] Total de almacenes
  - [*] Activos / inactivos
  - [ ] Con movimientos
- [*] Crear almacen
  - [*] Codigo y nombre
  - [*] Establecimiento asociado
  - [*] Descripcion y ubicacion
  - [*] Marcar como almacen principal
- [*] Editar almacen
- [*] Eliminar almacen (con control si tiene movimientos)

---

## Series de Comprobantes
- [ ] Listado de series por establecimiento
- [ ] Deteccion/correccion de series con tipo de documento inconsistente
- [ ] Filtro por tipo de comprobante
- [ ] Crear serie
  - [ ] Tipo de documento (Factura, Boleta, Nota de venta, Cotizacion, Recibo de cobranza)
  - [ ] Serie (validacion de prefijos B/F/C segun tipo)
  - [ ] Establecimiento asociado
  - [ ] Numero inicial y correlativo actual
  - [ ] Marcar como serie por defecto
  - [ ] Activar / desactivar serie
- [ ] Editar serie existente
- [ ] Ajustar correlativo (modal de ajuste)
- [ ] Eliminar serie (con validacion de uso)

---

## Configuracion de Negocio

### Seccion Pagos
- [ ] Gestion de formas de pago (crear / editar / activar)

### Seccion Informacion Bancaria
- [ ] Cuentas bancarias asociadas al negocio

### Seccion Unidades
- [ ] Gestion de unidades de medida
- [ ] Activar / desactivar unidades

### Seccion Impuestos
- [ ] Gestion de impuestos disponibles
- [ ] Preferencia "precios incluyen impuestos"

### Seccion Categorias
- [ ] Gestion de categorias de productos/servicios

### Seccion Datos contables
- [ ] Dashboard contable
- [ ] Plan de cuentas (gestion de cuentas contables)

### Seccion Preferencias
- [ ] Preferencias de ventas (ej. IGV incluido)

---

## Usuarios y Roles

### Pestana Usuarios
- [ ] Listado de usuarios
- [ ] Crear nuevo usuario
  - [ ] Nombre completo
  - [ ] Documento (tipo y numero)
  - [ ] Email y telefono
  - [ ] Establecimientos asignados
  - [ ] Usuario y contrasena
  - [ ] Requerir cambio de contrasena
- [ ] Editar usuario
- [ ] Cambiar estado (activo / inactivo / suspendido / terminado)
- [ ] Eliminar usuario
- [ ] Ver credenciales generadas (CredentialsModal)

### Pestana Roles
- [ ] Ver roles del sistema (SYSTEM_ROLES)
- [ ] Asignar roles a usuario (RoleAssignment)
- [ ] Validacion: seleccionar al menos un rol

---

## Cajas
- [ ] Listado de cajas por empresa / establecimiento
- [ ] Filtro por establecimiento (actual o todos)
- [ ] Busqueda por nombre de caja
- [ ] Filtro por estado (habilitadas / inhabilitadas)
- [ ] Crear nueva caja
  - [ ] Nombre de caja
  - [ ] Moneda
  - [ ] Medios de pago permitidos
  - [ ] Limite maximo y margen de descuadre
  - [ ] Usuarios autorizados
  - [ ] Dispositivos asociados y observaciones
- [ ] Editar caja existente
- [ ] Habilitar / inhabilitar caja
- [ ] Eliminar caja (confirmacion)
- [ ] Estadisticas rapidas (total, habilitadas, inhabilitadas, por establecimiento)
- [ ] Formulario dedicado crear/editar (CajaFormPage)

---

## Diseno de Comprobantes
- [ ] Seleccion de tipo de diseno
  - [ ] Diseno A4
  - [ ] Diseno Ticket
- [ ] Acciones generales
  - [ ] Exportar configuracion (JSON)
  - [ ] Importar configuracion (JSON)
  - [ ] Restaurar valores por defecto
- [ ] Pestana Logo
  - [ ] Configurar logo y posicion
- [ ] Pestana Marca de Agua
  - [ ] Configurar imagen, opacidad y posicion
- [ ] Pestana Pie de Pagina
  - [ ] Textos y datos legales del pie
- [ ] Pestana Campos de Documento
  - [ ] Mostrar / ocultar campos en cabecera
- [ ] Pestana Columnas (productos)
  - [ ] Configurar columnas para A4
  - [ ] Configurar columnas para Ticket
- [ ] Vista previa en tiempo real del comprobante
