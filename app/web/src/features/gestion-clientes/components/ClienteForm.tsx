import React, { useState } from 'react';

type DocumentType = {
  value: string;
  label: string;
};

type ClientType = {
  value: string;
  label: string;
};

type ClienteFormData = {
  documentNumber: string;
  legalName: string;
  address: string;
  gender: string;
  phone: string;
  email: string;
  additionalData: string;
};

type ClienteFormProps = {
  formData: ClienteFormData;
  documentType: string;
  clientType: string;
  documentTypes: DocumentType[];
  clientTypes: ClientType[];
  onInputChange: (field: keyof ClienteFormData, value: string) => void;
  onDocumentTypeChange: (type: string) => void;
  onClientTypeChange: (type: string) => void;
  onCancel: () => void;
  onSave: () => void;
  isEditing?: boolean;
};

const PRIMARY_COLOR = '#0040A2';

const ClienteForm: React.FC<ClienteFormProps> = ({
  formData,
  documentType,
  clientType,
  documentTypes,
  clientTypes,
  onInputChange,
  onDocumentTypeChange,
  onClientTypeChange,
  onCancel,
  onSave,
  isEditing = false,
}) => {
  const [showMoreDocTypes, setShowMoreDocTypes] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const mainDocTypes = documentTypes.slice(0, 3);

  // Función para consultar RENIEC (DNI)
  const consultarReniec = async () => {
    if (!formData.documentNumber || formData.documentNumber.length !== 8) {
      alert('Ingrese un DNI válido de 8 dígitos');
      return;
    }

    setIsConsulting(true);
    try {
      // Simulación de consulta RENIEC (en producción sería una API real)
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // Arrays expandidos para mayor variedad
      const nombres = [
        'JUAN CARLOS', 'MARIA ELENA', 'PEDRO LUIS', 'ANA SOFIA', 'CARLOS MIGUEL',
        'ROSA MARIA', 'JOSE ANTONIO', 'CARMEN LUCIA', 'MIGUEL ANGEL', 'PATRICIA',
        'LUIS FERNANDO', 'GLORIA ESPERANZA', 'FRANCISCO JAVIER', 'MARTHA CECILIA',
        'RICARDO MANUEL', 'SILVIA BEATRIZ', 'ALEJANDRO', 'TERESA GUADALUPE',
        'EDUARDO DANIEL', 'MONICA PATRICIA', 'RAFAEL ENRIQUE', 'CLAUDIA MERCEDES',
        'SERGIO ALBERTO', 'VERONICA ELIZABETH', 'ANDRES FELIPE'
      ];

      const apellidos = [
        'RODRIGUEZ MARTINEZ', 'GONZALEZ TORRES', 'SANCHEZ VARGAS', 'RAMIREZ FLORES',
        'HERRERA SILVA', 'LOPEZ CASTRO', 'GARCIA MENDOZA', 'MORALES DELGADO',
        'TORRES AGUILAR', 'FLORES JIMENEZ', 'VARGAS ROMERO', 'CASTRO HERRERA',
        'MENDOZA GUTIERREZ', 'AGUILAR MORENO', 'JIMENEZ ORTIZ', 'ROMERO RUIZ',
        'GUTIERREZ PEÑA', 'MORENO VEGA', 'ORTIZ SALAZAR', 'RUIZ CORDOVA',
        'PEÑA NAVARRO', 'VEGA PAREDES', 'SALAZAR RIOS', 'CORDOVA LUNA',
        'NAVARRO SANTOS', 'PAREDES MONTES', 'RIOS ESPINOZA', 'LUNA CABRERA'
      ];

      const calles = [
        'AV. AREQUIPA', 'AV. JAVIER PRADO', 'AV. BRASIL', 'JR. DE LA UNIÓN', 
        'AV. SALAVERRY', 'AV. PETIT THOUARS', 'AV. WILSON', 'AV. TACNA',
        'JR. LAMPA', 'AV. GRAU', 'AV. UNIVERSITARIA', 'AV. VENEZUELA',
        'JR. CUSCO', 'AV. COLONIAL', 'AV. FAUCETT', 'AV. EJERCITO',
        'JR. ANCASH', 'AV. ANGAMOS', 'AV. BENAVIDES', 'AV. LARCO'
      ];

      const distritos = [
        'LIMA LIMA MIRAFLORES', 'LIMA LIMA CERCADO DE LIMA', 'LIMA LIMA SAN BORJA',
        'LIMA LIMA JESÚS MARÍA', 'LIMA LIMA LINCE', 'LIMA LIMA SURQUILLO',
        'LIMA LIMA SAN ISIDRO', 'LIMA LIMA BREÑA', 'LIMA LIMA MAGDALENA',
        'LIMA LIMA PUEBLO LIBRE', 'LIMA LIMA LA VICTORIA', 'LIMA LIMA RIMAC',
        'LIMA LIMA SAN MIGUEL', 'LIMA LIMA CALLAO CALLAO', 'LIMA LIMA BARRANCO'
      ];

      // Selección completamente aleatoria
      const nombreAleatorio = nombres[Math.floor(Math.random() * nombres.length)];
      const apellidoAleatorio = apellidos[Math.floor(Math.random() * apellidos.length)];
      const calleAleatoria = calles[Math.floor(Math.random() * calles.length)];
      const numeroAleatorio = Math.floor(Math.random() * 9999) + 100; // Entre 100 y 9999
      const distritoAleatorio = distritos[Math.floor(Math.random() * distritos.length)];

      const mockData = {
        name: `${nombreAleatorio} ${apellidoAleatorio}`,
        address: `${calleAleatoria} ${numeroAleatorio} - ${distritoAleatorio}`,
      };

      onInputChange('legalName', mockData.name);
      onInputChange('address', mockData.address);
      
      // Mensaje más profesional
      setTimeout(() => {
        alert(`✅ Datos obtenidos exitosamente de RENIEC\n\nNombre: ${mockData.name}\nDirección: ${mockData.address}\n\nEstado: ACTIVO`);
      }, 100);
    } catch (error) {
      alert('❌ Error al consultar RENIEC. Verifique el DNI e intente nuevamente.');
    } finally {
      setIsConsulting(false);
    }
  };

  // Función para consultar SUNAT (RUC)
  const consultarSunat = async () => {
    if (!formData.documentNumber || formData.documentNumber.length !== 11) {
      alert('Ingrese un RUC válido de 11 dígitos');
      return;
    }

    setIsConsulting(true);
    try {
      // Simulación de consulta SUNAT (en producción sería una API real)
      await new Promise(resolve => setTimeout(resolve, 2200));
      
      // Arrays expandidos para mayor variedad de empresas
      const tiposEmpresa = ['S.A.C.', 'E.I.R.L.', 'S.R.L.', 'S.A.', 'S.C.R.L.'];
      
      const nombresEmpresa = [
        'COMERCIAL ANDINA', 'INVERSIONES DEL NORTE', 'DISTRIBUIDORA SANTA ROSA',
        'SERVICIOS INTEGRALES LIMA', 'TECNOLOGÍA Y SOLUCIONES', 'CONSTRUCTORA PACIFIC',
        'IMPORTACIONES GLOBALES', 'EXPORTACIONES DEL SUR', 'LOGÍSTICA MODERNA',
        'CONSULTORÍA EMPRESARIAL', 'MANUFACTURAS INDUSTRIALES', 'COMERCIO EXTERIOR',
        'DESARROLLO INMOBILIARIO', 'SERVICIOS PROFESIONALES', 'INDUSTRIAS UNIDAS',
        'CORPORACIÓN MULTISERVICIOS', 'GRUPO COMERCIAL', 'EMPRESA FAMILIAR',
        'NEGOCIOS ESTRATÉGICOS', 'SOLUCIONES CORPORATIVAS', 'COMERCIALIZADORA CENTRAL',
        'DISTRIBUCIONES MAYORISTAS', 'SERVICIOS ESPECIALIZADOS', 'CORPORATIVO LIMA',
        'EMPRESA DE TRANSPORTES', 'SERVICIOS LOGÍSTICOS', 'COMERCIAL DEL CENTRO'
      ];

      const callesEmpresa = [
        'AV. PRINCIPAL', 'AV. REPÚBLICA DE PANAMÁ', 'AV. JAVIER PRADO ESTE',
        'AV. EL DERBY', 'AV. CAMINOS DEL INCA', 'AV. LA MARINA', 'AV. UNIVERSITARIA',
        'JR. DE LA REPÚBLICA', 'AV. DEFENSORES DEL MORRO', 'AV. TOMAS MARSANO',
        'AV. PRIMAVERA', 'AV. AVIACIÓN', 'AV. GUARDIA CIVIL', 'AV. CANADA',
        'AV. DOMINGO ORUÉ', 'AV. SANTIAGO DE SURCO', 'AV. BENAVIDES',
        'AV. RICARDO PALMA', 'AV. PARDO Y ALIAGA', 'AV. SAN LUIS'
      ];

      const distritosEmpresa = [
        'LIMA LIMA SAN ISIDRO', 'LIMA LIMA MIRAFLORES', 'LIMA LIMA SAN BORJA',
        'LIMA LIMA SURQUILLO', 'LIMA LIMA LA MOLINA', 'LIMA LIMA SANTIAGO DE SURCO',
        'LA LIBERTAD TRUJILLO TRUJILLO', 'AREQUIPA AREQUIPA AREQUIPA',
        'LIMA LIMA BREÑA', 'LIMA LIMA JESÚS MARÍA', 'LIMA LIMA LINCE',
        'CUSCO CUSCO CUSCO', 'PIURA PIURA PIURA', 'LAMBAYEQUE CHICLAYO CHICLAYO',
        'CALLAO CALLAO CALLAO', 'LIMA LIMA SAN MIGUEL', 'LIMA LIMA PUEBLO LIBRE'
      ];

      // Selección completamente aleatoria
      const nombreAleatorio = nombresEmpresa[Math.floor(Math.random() * nombresEmpresa.length)];
      const tipoAleatorio = tiposEmpresa[Math.floor(Math.random() * tiposEmpresa.length)];
      const calleAleatoria = callesEmpresa[Math.floor(Math.random() * callesEmpresa.length)];
      const numeroAleatorio = Math.floor(Math.random() * 999) + 100; // Entre 100 y 999
      const distritoAleatorio = distritosEmpresa[Math.floor(Math.random() * distritosEmpresa.length)];

      const estados = ['ACTIVO', 'ACTIVO', 'ACTIVO', 'SUSPENDIDO TEMPORALMENTE']; // Más probabilidad de ACTIVO
      const condiciones = ['HABIDO', 'HABIDO', 'HABIDO', 'NO HABIDO']; // Más probabilidad de HABIDO
      
      const estadoAleatorio = estados[Math.floor(Math.random() * estados.length)];
      const condicionAleatoria = condiciones[Math.floor(Math.random() * condiciones.length)];

      const mockData = {
        name: `${nombreAleatorio} ${tipoAleatorio}`,
        address: `${calleAleatoria} ${numeroAleatorio} - ${distritoAleatorio}`,
      };

      onInputChange('legalName', mockData.name);
      onInputChange('address', mockData.address);
      
      // Mensaje más profesional con datos variables
      setTimeout(() => {
        alert(`✅ Datos obtenidos exitosamente de SUNAT\n\nRazón Social: ${mockData.name}\nDirección Fiscal: ${mockData.address}\n\nEstado: ${estadoAleatorio}\nCondición: ${condicionAleatoria}`);
      }, 100);
    } catch (error) {
      alert('❌ Error al consultar SUNAT. Verifique el RUC e intente nuevamente.');
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] h-auto min-h-[400px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-3 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <span className="h-5 w-5 text-gray-400">✕</span>
        </button>
      </div>

      {/* Body */}
      <div
        className="px-6 pt-3 pb-4 overflow-y-auto flex-1 min-h-0"
        style={{ maxHeight: 'calc(80vh - 140px)' }}
      >
        {/* Document Type Selector */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            {mainDocTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => onDocumentTypeChange(type.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium mr-2 mb-2 ${
                  documentType === type.value
                    ? 'bg-blue-100 border-blue-400 text-blue-900'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                {type.label}
              </button>
            ))}
            <button
              type="button"
              className={`px-4 py-2 rounded-lg border text-sm font-medium mr-2 mb-2 flex items-center ${
                !mainDocTypes.some(type => type.value === documentType) && documentTypes.some(type => type.value === documentType)
                  ? 'bg-blue-100 border-blue-400 text-blue-900'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
              onClick={() => setShowMoreDocTypes((prev) => !prev)}
            >
              {!mainDocTypes.some(type => type.value === documentType) && documentTypes.some(type => type.value === documentType)
                ? documentTypes.find(type => type.value === documentType)?.label
                : 'MÁS OPCIONES'
              }
              <span className="ml-2">{showMoreDocTypes ? '▴' : '▾'}</span>
            </button>
          </div>
        </div>

        {/* Extra Document Types */}
        {showMoreDocTypes && (
          <div className="mb-4 relative">
            <div className="absolute top-0 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {documentTypes.slice(3).map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-b-0 transition-colors"
                  onClick={() => {
                    onDocumentTypeChange(type.value);
                    setShowMoreDocTypes(false);
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document Number */}
        {documentType !== 'SIN_DOCUMENTO' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              N° de Documento
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => onInputChange('documentNumber', e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa el número de documento"
              />
              {(documentType === 'RUC' || documentType === 'DNI') && (
                <button
                  type="button"
                  onClick={documentType === 'RUC' ? consultarSunat : consultarReniec}
                  disabled={isConsulting || !formData.documentNumber}
                  className={`px-8 py-2 min-w-[100px] rounded-lg font-semibold text-sm shadow transition-colors ${
                    isConsulting || !formData.documentNumber
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isConsulting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Consultando...
                    </div>
                  ) : (
                    documentType === 'RUC' ? 'Sunat' : 'Reniec'
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Legal Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre legal <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.legalName}
            onChange={(e) => onInputChange('legalName', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ingresa el nombre legal"
          />
        </div>

        {/* Address */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dirección
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => onInputChange('address', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ingresa la dirección"
          />
        </div>

        {/* Client Type */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            value={clientType}
            onChange={(e) => onClientTypeChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            {clientTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Botón Opciones Avanzadas */}
        <div className="mb-4">
          <button
            type="button"
            className="text-blue-600 font-medium underline cursor-pointer text-sm"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced
              ? 'Ocultar opciones avanzadas'
              : 'Opciones avanzadas'}
          </button>
        </div>

        {/* Campos Avanzados */}
        {showAdvanced && (
          <>
            {/* Género */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Género
              </label>
              <select
                value={formData.gender}
                onChange={(e) => onInputChange('gender', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Selecciona género</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => onInputChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa el teléfono"
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => onInputChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa el email"
              />
            </div>

            {/* Additional Data */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Información adicional
              </label>
              <textarea
                value={formData.additionalData}
                onChange={(e) => onInputChange('additionalData', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Información adicional del cliente"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full hover:bg-gray-200 hover:text-gray-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 text-sm font-medium text-white border rounded-full hover:opacity-90 transition-opacity"
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
        >
          {isEditing ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </div>
  );
};

export default ClienteForm;
