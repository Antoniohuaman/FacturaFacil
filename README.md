src/
├── assets/
├── components/
│   └── ui/                     # Componentes globales reutilizables (botones, inputs, etc.)
├── layouts/
│   ├── PublicLayout.jsx
│   └── PrivateLayout.jsx
├── routes/
│   ├── PublicRoutes.jsx
│   └── PrivateRoutes.jsx
├── hooks/                      # Hooks globales o cross-cutting (ej: useAuth, useApi)
├── services/                   # Clientes HTTP genéricos o instancias de axios/fetch
├── store/                      # Estado global si lo usas (Redux, etc.)
├── utils/                      # Funciones comunes (formateo, fechas, validaciones)
├── contasis/                   # comonentes
├── pages/
│   ├── public/
│   │   ├── features/           ← Features solo para contexto público
│   │   │   └── auth/
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       └── services/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   └── private/
│       ├── features/           ← Features solo para contexto privado
│       │   ├── dashboard/
│       │   ├── receipts/
│       │   └── subscriptions/  # Aquí iría tu lógica
│       ├── Dashboard.jsx
│       ├── Receipts.jsx
│       └── Subscriptions.jsx
└── App.jsx