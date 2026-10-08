// spanish translations

export default {
  dashboard: {
    headerTitle: "Resumen",
    headerDescription: "Tu colección de un vistazo.",
    bodyTitle: "Bienvenido a CoinsLite",
    bodyDescription: "Tu colección aparecerá aquí.",
  },
  settings: {
    title: "Configuración",
    headerTitle: "Configuración",
    headerDescription: "Administra tus configuraciones de cuenta.",
    avatar: {
      title: "Tu Avatar",
      description: "Este es tu avatar. Se mostrará en tu perfil.",
      uploadHint:
        "Haz clic en el avatar para subir uno personalizado desde tus archivos.",
      resetButton: "Restablecer",
    },
    deleteAccount: {
      title: "Eliminar Cuenta",
      description:
        "Elimina permanentemente tu cuenta de CoinsLite y todo su contenido.",
      warning: "Esta acción no se puede deshacer, procede con precaución.",
      deleteButton: "Eliminar Cuenta",
      confirmButton: "¿Estás seguro?",
    },
    sidebar: {
      general: "General",
      billing: "Facturación",
    },
  },
} as const;
