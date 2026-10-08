export default {
  common: {
    language: "Language",
    appDescription: "Record the coins, banknotes and stamps you own.",
  },
  login: {
    title: "Sign in",
    tagline: "Sign in to your collection",
    continueWithGoogle: "Continue with Google",
  },
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
      title: "Your avatar",
      description: "This is your avatar. It's shown on your profile.",
      uploadHint: "Click the avatar to upload your own picture.",
      resetButton: "Reset",
    },
    deleteAccount: {
      title: "Delete account",
      description:
        "Permanently delete your CoinsLite account and everything in it.",
      warning: "This can't be undone. Proceed with care.",
      deleteButton: "Delete account",
      confirmButton: "Are you sure?",
    },
    sidebar: {
      general: "General",
      billing: "Billing",
    },
  },
} as const;
