Api login http://localhost:5242/api/v1/usuarios/login
body {
"email": "ycamposde@gmail.com",
"password": "12345678"
}
response
{
"exito": true,
"mensaje": "Login exitoso. Requiere cambio de contraseña",
"codigoError": "0",
"data": {
"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZWY5ODkzNC1lYmFiLTQyOWYtYTE0Ni03MWY5MDFmNmY3Y2EiLCJ1bmlxdWVfbmFtZSI6InljYW1wb3NkZSIsImVtYWlsIjoieWNhbXBvc2RlQGdtYWlsLmNvbSIsImp0aSI6IjgwZGFkYTE1LTk1MDUtNDhjNS1hYWI2LTJlOGU1YzgzMzUyMSIsImV4cCI6MTc2OTA2MTUwOCwiaXNzIjoiQXBpU2VuY2l5byIsImF1ZCI6IkFwaVNlbmNpeW8ifQ.jVjPwHrPjY1NKP4JjkzsKFSdS_kXnWfHOrfQ86EKJ1c",
"id": "1ef98934-ebab-429f-a146-71f901f6f7ca",
"nombre": "YERSON",
"apellido": "CAMPOS",
"email": "ycamposde@gmail.com",
"username": "ycamposde",
"requiereCambioPassword": true,
"empresas": [
{
"id": "ca4bce9e-37e9-4719-bc71-e2d958848937",
"empresaId": "e89f26d1-1b65-48f1-964d-ab032f73a36a",
"usuarioId": "1ef98934-ebab-429f-a146-71f901f6f7ca",
"establecimientoId": "4653271b-a79a-4179-b16c-ee9c1b1ec723",
"tipoDocumento": null,
"numeroDocumento": null,
"esActivo": true,
"createdAt": "0001-01-01T00:00:00",
"updatedAt": "0001-01-01T00:00:00",
"empresaRuc": "20000000000",
"empresaRazonSocial": "SENCIYO S.A.C.",
"establecimientoCodigo": "0001",
"establecimientoNombre": "Establecimiento",
"usuarioNombre": null,
"usuarioEmail": null
}
],
"establecimientos": [
{
"id": "4653271b-a79a-4179-b16c-ee9c1b1ec723",
"empresaId": "e89f26d1-1b65-48f1-964d-ab032f73a36a",
"codigo": "0001",
"nombre": "Establecimiento",
"direccion": "AV. PRINCIPAL 789, MIRAFLORES, LIMA, LIMA",
"codigoDistrito": "15",
"distrito": "LIMA",
"codigoProvincia": "01",
"provincia": "LIMA",
"codigoDepartamento": "31",
"departamento": "LIMA",
"codigoPostal": "150131",
"telefono": null,
"correo": null,
"esActivo": true,
"usuarioId": "1ef98934-ebab-429f-a146-71f901f6f7ca",
"usuarioNombre": "YERSON CAMPOS",
"createdAt": "2026-01-21T21:56:04.967971Z",
"updatedAt": "2026-01-21T21:56:04.967971Z"
}
]
},
"timestamp": "2026-01-21T16:58:28.6196461-05:00"
}
