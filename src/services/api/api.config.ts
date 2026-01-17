export const API_CONFIG = {
  BASE_URL: '//ycamposde.negociosonline.contasiscorp.test',
  API_VERSION: 'v1',
  TIMEOUT: 30000,
} as const;

export const STORAGE_KEYS = {
  EMPRESA_ID: 'EMPRESA_ID',
  ESTABLECIMIENTO_ID: 'ESTABLECIMIENTO_ID',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;
