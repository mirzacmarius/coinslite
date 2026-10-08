export default {
  dashboard: {
    headerTitle: "Overview",
    headerDescription: "Your collection at a glance.",
    bodyTitle: "Welcome to CoinsLite",
    bodyDescription: "Your collection will appear here.",
  },
  settings: {
    title: "Settings",
    headerTitle: "Settings",
    headerDescription: "Manage your account settings.",
    avatar: {
      title: "Your Avatar",
      description: "This is your avatar. It will be displayed on your profile.",
      uploadHint: "Click on the avatar to upload a custom one from your files.",
      resetButton: "Reset",
    },
    deleteAccount: {
      title: "Delete Account",
      description:
        "Permanently delete your CoinsLite account and everything in it.",
      warning: "This action cannot be undone, proceed with caution.",
      deleteButton: "Delete Account",
      confirmButton: "Are you sure?",
    },
    sidebar: {
      general: "General",
      billing: "Billing",
    },
  },
} as const;
