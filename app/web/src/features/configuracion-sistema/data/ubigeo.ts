// Data de Ubigeo de Perú - Departamentos, Provincias y Distritos
export interface District {
  code: string;
  name: string;
}

export interface Province {
  code: string;
  name: string;
  districts: District[];
}

export interface Department {
  code: string;
  name: string;
  provinces: Province[];
}

export const ubigeoData: Department[] = [
  {
    code: '01',
    name: 'Amazonas',
    provinces: [
      {
        code: '0101',
        name: 'Chachapoyas',
        districts: [
          { code: '010101', name: 'Chachapoyas' },
          { code: '010102', name: 'Asunción' },
          { code: '010103', name: 'Balsas' },
        ]
      },
      {
        code: '0102',
        name: 'Bagua',
        districts: [
          { code: '010201', name: 'Bagua' },
          { code: '010202', name: 'Aramango' },
        ]
      }
    ]
  },
  {
    code: '02',
    name: 'Áncash',
    provinces: [
      {
        code: '0201',
        name: 'Huaraz',
        districts: [
          { code: '020101', name: 'Huaraz' },
          { code: '020102', name: 'Cochabamba' },
          { code: '020103', name: 'Independencia' },
        ]
      }
    ]
  },
  {
    code: '03',
    name: 'Apurímac',
    provinces: [
      {
        code: '0301',
        name: 'Abancay',
        districts: [
          { code: '030101', name: 'Abancay' },
          { code: '030102', name: 'Chacoche' },
        ]
      }
    ]
  },
  {
    code: '04',
    name: 'Arequipa',
    provinces: [
      {
        code: '0401',
        name: 'Arequipa',
        districts: [
          { code: '040101', name: 'Arequipa' },
          { code: '040102', name: 'Alto Selva Alegre' },
          { code: '040103', name: 'Cayma' },
          { code: '040104', name: 'Cerro Colorado' },
          { code: '040105', name: 'Characato' },
          { code: '040106', name: 'Chiguata' },
          { code: '040107', name: 'Jacobo Hunter' },
          { code: '040108', name: 'José Luis Bustamante y Rivero' },
          { code: '040109', name: 'La Joya' },
          { code: '040110', name: 'Mariano Melgar' },
          { code: '040111', name: 'Miraflores' },
          { code: '040112', name: 'Paucarpata' },
          { code: '040113', name: 'Pocsi' },
          { code: '040114', name: 'Sabandia' },
          { code: '040115', name: 'Sachaca' },
          { code: '040116', name: 'San Juan de Siguas' },
          { code: '040117', name: 'San Juan de Tarucani' },
          { code: '040118', name: 'Santa Isabel de Siguas' },
          { code: '040119', name: 'Santa Rita de Siguas' },
          { code: '040120', name: 'Socabaya' },
          { code: '040121', name: 'Tiabaya' },
          { code: '040122', name: 'Uchumayo' },
          { code: '040123', name: 'Vitor' },
          { code: '040124', name: 'Yanahuara' },
          { code: '040125', name: 'Yarabamba' },
          { code: '040126', name: 'Yura' },
        ]
      },
      {
        code: '0402',
        name: 'Camaná',
        districts: [
          { code: '040201', name: 'Camaná' },
          { code: '040202', name: 'José María Quimper' },
          { code: '040203', name: 'Mariscal Cáceres' },
        ]
      }
    ]
  },
  {
    code: '05',
    name: 'Ayacucho',
    provinces: [
      {
        code: '0501',
        name: 'Huamanga',
        districts: [
          { code: '050101', name: 'Ayacucho' },
          { code: '050102', name: 'Carmen Alto' },
          { code: '050103', name: 'San Juan Bautista' },
        ]
      }
    ]
  },
  {
    code: '06',
    name: 'Cajamarca',
    provinces: [
      {
        code: '0601',
        name: 'Cajamarca',
        districts: [
          { code: '060101', name: 'Cajamarca' },
          { code: '060102', name: 'Asunción' },
          { code: '060103', name: 'Chetilla' },
        ]
      }
    ]
  },
  {
    code: '07',
    name: 'Callao',
    provinces: [
      {
        code: '0701',
        name: 'Callao',
        districts: [
          { code: '070101', name: 'Callao' },
          { code: '070102', name: 'Bellavista' },
          { code: '070103', name: 'Carmen de la Legua Reynoso' },
          { code: '070104', name: 'La Perla' },
          { code: '070105', name: 'La Punta' },
          { code: '070106', name: 'Mi Perú' },
          { code: '070107', name: 'Ventanilla' },
        ]
      }
    ]
  },
  {
    code: '08',
    name: 'Cusco',
    provinces: [
      {
        code: '0801',
        name: 'Cusco',
        districts: [
          { code: '080101', name: 'Cusco' },
          { code: '080102', name: 'Ccorca' },
          { code: '080103', name: 'Poroy' },
          { code: '080104', name: 'San Jerónimo' },
          { code: '080105', name: 'San Sebastián' },
          { code: '080106', name: 'Santiago' },
          { code: '080107', name: 'Saylla' },
          { code: '080108', name: 'Wanchaq' },
        ]
      }
    ]
  },
  {
    code: '09',
    name: 'Huancavelica',
    provinces: [
      {
        code: '0901',
        name: 'Huancavelica',
        districts: [
          { code: '090101', name: 'Huancavelica' },
          { code: '090102', name: 'Acobambilla' },
        ]
      }
    ]
  },
  {
    code: '10',
    name: 'Huánuco',
    provinces: [
      {
        code: '1001',
        name: 'Huánuco',
        districts: [
          { code: '100101', name: 'Huánuco' },
          { code: '100102', name: 'Amarilis' },
          { code: '100103', name: 'Chinchao' },
        ]
      }
    ]
  },
  {
    code: '11',
    name: 'Ica',
    provinces: [
      {
        code: '1101',
        name: 'Ica',
        districts: [
          { code: '110101', name: 'Ica' },
          { code: '110102', name: 'La Tinguiña' },
          { code: '110103', name: 'Los Aquijes' },
          { code: '110104', name: 'Parcona' },
          { code: '110105', name: 'Pueblo Nuevo' },
          { code: '110106', name: 'Salas' },
          { code: '110107', name: 'San José de Los Molinos' },
          { code: '110108', name: 'San Juan Bautista' },
          { code: '110109', name: 'Santiago' },
          { code: '110110', name: 'Subtanjalla' },
          { code: '110111', name: 'Tate' },
          { code: '110112', name: 'Yauca del Rosario' },
        ]
      },
      {
        code: '1102',
        name: 'Chincha',
        districts: [
          { code: '110201', name: 'Chincha Alta' },
          { code: '110202', name: 'Chincha Baja' },
          { code: '110203', name: 'El Carmen' },
        ]
      }
    ]
  },
  {
    code: '12',
    name: 'Junín',
    provinces: [
      {
        code: '1201',
        name: 'Huancayo',
        districts: [
          { code: '120101', name: 'Huancayo' },
          { code: '120102', name: 'Carhuacallanga' },
          { code: '120103', name: 'Chacapampa' },
          { code: '120104', name: 'Chicche' },
          { code: '120105', name: 'Chilca' },
          { code: '120106', name: 'Chongos Alto' },
          { code: '120107', name: 'Chupuro' },
          { code: '120108', name: 'Colca' },
          { code: '120109', name: 'Cullhuas' },
          { code: '120110', name: 'El Tambo' },
        ]
      }
    ]
  },
  {
    code: '13',
    name: 'La Libertad',
    provinces: [
      {
        code: '1301',
        name: 'Trujillo',
        districts: [
          { code: '130101', name: 'Trujillo' },
          { code: '130102', name: 'El Porvenir' },
          { code: '130103', name: 'Florencia de Mora' },
          { code: '130104', name: 'Huanchaco' },
          { code: '130105', name: 'La Esperanza' },
          { code: '130106', name: 'Laredo' },
          { code: '130107', name: 'Moche' },
          { code: '130108', name: 'Poroto' },
          { code: '130109', name: 'Salaverry' },
          { code: '130110', name: 'Simbal' },
          { code: '130111', name: 'Victor Larco Herrera' },
        ]
      }
    ]
  },
  {
    code: '14',
    name: 'Lambayeque',
    provinces: [
      {
        code: '1401',
        name: 'Chiclayo',
        districts: [
          { code: '140101', name: 'Chiclayo' },
          { code: '140102', name: 'Chongoyape' },
          { code: '140103', name: 'Eten' },
          { code: '140104', name: 'Eten Puerto' },
          { code: '140105', name: 'José Leonardo Ortiz' },
          { code: '140106', name: 'La Victoria' },
          { code: '140107', name: 'Lagunas' },
          { code: '140108', name: 'Monsefu' },
          { code: '140109', name: 'Nueva Arica' },
          { code: '140110', name: 'Oyotun' },
          { code: '140111', name: 'Picsi' },
          { code: '140112', name: 'Pimentel' },
          { code: '140113', name: 'Reque' },
          { code: '140114', name: 'Santa Rosa' },
          { code: '140115', name: 'Saña' },
          { code: '140116', name: 'Cayalti' },
          { code: '140117', name: 'Patapo' },
          { code: '140118', name: 'Pomalca' },
          { code: '140119', name: 'Pucala' },
          { code: '140120', name: 'Tuman' },
        ]
      }
    ]
  },
  {
    code: '15',
    name: 'Lima',
    provinces: [
      {
        code: '1501',
        name: 'Lima',
        districts: [
          { code: '150101', name: 'Lima' },
          { code: '150102', name: 'Ancón' },
          { code: '150103', name: 'Ate' },
          { code: '150104', name: 'Barranco' },
          { code: '150105', name: 'Breña' },
          { code: '150106', name: 'Carabayllo' },
          { code: '150107', name: 'Chaclacayo' },
          { code: '150108', name: 'Chorrillos' },
          { code: '150109', name: 'Cieneguilla' },
          { code: '150110', name: 'Comas' },
          { code: '150111', name: 'El Agustino' },
          { code: '150112', name: 'Independencia' },
          { code: '150113', name: 'Jesús María' },
          { code: '150114', name: 'La Molina' },
          { code: '150115', name: 'La Victoria' },
          { code: '150116', name: 'Lince' },
          { code: '150117', name: 'Los Olivos' },
          { code: '150118', name: 'Lurigancho' },
          { code: '150119', name: 'Lurín' },
          { code: '150120', name: 'Magdalena del Mar' },
          { code: '150121', name: 'Miraflores' },
          { code: '150122', name: 'Pachacámac' },
          { code: '150123', name: 'Pucusana' },
          { code: '150124', name: 'Pueblo Libre' },
          { code: '150125', name: 'Puente Piedra' },
          { code: '150126', name: 'Punta Hermosa' },
          { code: '150127', name: 'Punta Negra' },
          { code: '150128', name: 'Rímac' },
          { code: '150129', name: 'San Bartolo' },
          { code: '150130', name: 'San Borja' },
          { code: '150131', name: 'San Isidro' },
          { code: '150132', name: 'San Juan de Lurigancho' },
          { code: '150133', name: 'San Juan de Miraflores' },
          { code: '150134', name: 'San Luis' },
          { code: '150135', name: 'San Martín de Porres' },
          { code: '150136', name: 'San Miguel' },
          { code: '150137', name: 'Santa Anita' },
          { code: '150138', name: 'Santa María del Mar' },
          { code: '150139', name: 'Santa Rosa' },
          { code: '150140', name: 'Santiago de Surco' },
          { code: '150141', name: 'Surquillo' },
          { code: '150142', name: 'Villa El Salvador' },
          { code: '150143', name: 'Villa María del Triunfo' },
        ]
      }
    ]
  },
  {
    code: '16',
    name: 'Loreto',
    provinces: [
      {
        code: '1601',
        name: 'Maynas',
        districts: [
          { code: '160101', name: 'Iquitos' },
          { code: '160102', name: 'Alto Nanay' },
          { code: '160103', name: 'Fernando Lores' },
          { code: '160104', name: 'Indiana' },
          { code: '160105', name: 'Las Amazonas' },
          { code: '160106', name: 'Mazán' },
          { code: '160107', name: 'Napo' },
          { code: '160108', name: 'Punchana' },
          { code: '160109', name: 'Torres Causana' },
          { code: '160110', name: 'Belén' },
          { code: '160111', name: 'San Juan Bautista' },
        ]
      }
    ]
  },
  {
    code: '17',
    name: 'Madre de Dios',
    provinces: [
      {
        code: '1701',
        name: 'Tambopata',
        districts: [
          { code: '170101', name: 'Tambopata' },
          { code: '170102', name: 'Inambari' },
          { code: '170103', name: 'Las Piedras' },
          { code: '170104', name: 'Laberinto' },
        ]
      }
    ]
  },
  {
    code: '18',
    name: 'Moquegua',
    provinces: [
      {
        code: '1801',
        name: 'Mariscal Nieto',
        districts: [
          { code: '180101', name: 'Moquegua' },
          { code: '180102', name: 'Carumas' },
          { code: '180103', name: 'Cuchumbaya' },
        ]
      }
    ]
  },
  {
    code: '19',
    name: 'Pasco',
    provinces: [
      {
        code: '1901',
        name: 'Pasco',
        districts: [
          { code: '190101', name: 'Chaupimarca' },
          { code: '190102', name: 'Huachon' },
        ]
      }
    ]
  },
  {
    code: '20',
    name: 'Piura',
    provinces: [
      {
        code: '2001',
        name: 'Piura',
        districts: [
          { code: '200101', name: 'Piura' },
          { code: '200102', name: 'Castilla' },
          { code: '200103', name: 'Catacaos' },
          { code: '200104', name: 'Cura Mori' },
          { code: '200105', name: 'El Tallan' },
          { code: '200106', name: 'La Arena' },
          { code: '200107', name: 'La Unión' },
          { code: '200108', name: 'Las Lomas' },
          { code: '200109', name: 'Tambo Grande' },
        ]
      }
    ]
  },
  {
    code: '21',
    name: 'Puno',
    provinces: [
      {
        code: '2101',
        name: 'Puno',
        districts: [
          { code: '210101', name: 'Puno' },
          { code: '210102', name: 'Acora' },
          { code: '210103', name: 'Amantani' },
          { code: '210104', name: 'Atuncolla' },
          { code: '210105', name: 'Capachica' },
          { code: '210106', name: 'Chucuito' },
          { code: '210107', name: 'Coata' },
          { code: '210108', name: 'Huata' },
          { code: '210109', name: 'Mañazo' },
          { code: '210110', name: 'Paucarcolla' },
          { code: '210111', name: 'Pichacani' },
          { code: '210112', name: 'Platería' },
          { code: '210113', name: 'San Antonio' },
          { code: '210114', name: 'Tiquillaca' },
          { code: '210115', name: 'Vilque' },
        ]
      }
    ]
  },
  {
    code: '22',
    name: 'San Martín',
    provinces: [
      {
        code: '2201',
        name: 'Moyobamba',
        districts: [
          { code: '220101', name: 'Moyobamba' },
          { code: '220102', name: 'Calzada' },
          { code: '220103', name: 'Habana' },
        ]
      }
    ]
  },
  {
    code: '23',
    name: 'Tacna',
    provinces: [
      {
        code: '2301',
        name: 'Tacna',
        districts: [
          { code: '230101', name: 'Tacna' },
          { code: '230102', name: 'Alto de la Alianza' },
          { code: '230103', name: 'Calana' },
          { code: '230104', name: 'Ciudad Nueva' },
          { code: '230105', name: 'Inclán' },
          { code: '230106', name: 'Pachia' },
          { code: '230107', name: 'Palca' },
          { code: '230108', name: 'Pocollay' },
          { code: '230109', name: 'Sama' },
          { code: '230110', name: 'Coronel Gregorio Albarracín Lanchipa' },
        ]
      }
    ]
  },
  {
    code: '24',
    name: 'Tumbes',
    provinces: [
      {
        code: '2401',
        name: 'Tumbes',
        districts: [
          { code: '240101', name: 'Tumbes' },
          { code: '240102', name: 'Corrales' },
          { code: '240103', name: 'La Cruz' },
          { code: '240104', name: 'Pampas de Hospital' },
          { code: '240105', name: 'San Jacinto' },
          { code: '240106', name: 'San Juan de la Virgen' },
        ]
      }
    ]
  },
  {
    code: '25',
    name: 'Ucayali',
    provinces: [
      {
        code: '2501',
        name: 'Coronel Portillo',
        districts: [
          { code: '250101', name: 'Callería' },
          { code: '250102', name: 'Campoverde' },
          { code: '250103', name: 'Iparia' },
          { code: '250104', name: 'Masisea' },
          { code: '250105', name: 'Yarinacocha' },
          { code: '250106', name: 'Nueva Requena' },
          { code: '250107', name: 'Manantay' },
        ]
      }
    ]
  }
];
