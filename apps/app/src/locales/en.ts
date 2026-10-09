export default {
  common: {
    language: "Language",
    appDescription: "Record the coins, banknotes and stamps you own.",
  },
  nav: {
    overview: "Overview",
    collection: "Collection",
    catalog: "Catalog",
    albums: "Albums",
    account: "Account",
  },
  shell: {
    skipToContent: "Skip to content",
    primaryNavigation: "Main",
    signOut: "Sign out",
    workspaceMenu: "Account and preferences",
    plans: "Plans",
    appearance: "Appearance",
    appearanceLight: "Light",
    appearanceDark: "Dark",
    appearanceSystem: "System",
    more: "More",
  },
  placeholder: {
    title: "Nothing here yet",
    description: "This part of CoinsLite is on its way.",
  },
  auth: {
    signIn: {
      pageTitle: "Sign in",
      title: "Sign in to your collection",
      submit: "Sign in",
      forgotPassword: "Forgot password?",
      noAccount: "New to CoinsLite?",
      createAccount: "Create an account",
      failed:
        "That email and password don't match. Check them, or reset your password.",
      verifyToContinue: "Verify your email to finish signing in.",
    },
    signUp: {
      pageTitle: "Create account",
      title: "Create your account",
      description: "Record the coins, banknotes and stamps you own.",
      submit: "Create account",
      homeCurrencyHint: "Values in your Collection are shown in this currency.",
      acceptTerms: "I accept the {privacy} and the {terms}",
      privacyPolicy: "privacy policy",
      termsOfUse: "terms of use",
      termsRequired: "Accept the privacy policy and terms of use to continue.",
      haveAccount: "Already have an account?",
      failed:
        "We couldn't create the account. If you already have one, sign in with your password, a sign-in link or Google.",
    },
    fields: {
      email: "Email",
      password: "Password",
      newPassword: "New password",
      homeCurrency: "Home currency",
      passwordHint: "At least 8 characters.",
      code: "Code",
      emailInvalid: "Enter an email address, like name@example.com.",
      passwordTooShort: "Use at least 8 characters.",
      passwordRequired: "Enter your password.",
      codeInvalid: "Enter the 8 digits from the email.",
    },
    code: {
      title: "Check your email",
      description:
        "We sent an 8-digit code to {email}. It expires in 15 minutes.",
      submit: "Verify email",
      resend: "Send a new code",
      resent: "We sent a new code to {email}.",
      differentEmail: "Use a different email",
      failed: "That code didn't work. Check it, or send a new one.",
    },
    verify: {
      pageTitle: "Verify email",
      title: "Verify your email",
      description: "Confirm that {email} is yours to finish signing up.",
      confirm: "Verify my email",
      failed:
        "This link has expired or was already used. Sign in to get a new code.",
      noLink:
        "Open the link from your verification email, or sign in to get a new code.",
    },
    reset: {
      pageTitle: "Reset password",
      title: "Reset your password",
      description: "We'll email you a code to choose a new password.",
      sendCode: "Send code",
      codeSent:
        "If {email} has a CoinsLite account, we sent it a code. It expires in 15 minutes.",
      newPasswordTitle: "Choose a new password",
      submit: "Save password",
      failed: "That code didn't work or has expired. Ask for a new one.",
    },
    methods: {
      or: "or",
      google: "Continue with Google",
      link: "Email me a sign-in link",
    },
    link: {
      pageTitle: "Sign in with a link",
      title: "Sign in with a link",
      description:
        "We'll email you a link that signs you in. New to CoinsLite? The same link creates your account.",
      submit: "Email me a link",
      sentTitle: "Check your email",
      sent: "We sent a sign-in link to {email}. It works once and expires in 15 minutes.",
      usePassword: "Use a password instead",
      failed:
        "This sign-in link has expired or was already used. Ask for a new one.",
      confirmTitle: "Sign in to CoinsLite",
      confirmDescription: "Continue as {email}.",
      confirm: "Sign in",
    },
    welcome: {
      pageTitle: "Finish setting up",
      title: "Finish setting up your account",
      description:
        "Signed in as {email}. Choose your Home currency and accept the terms to start.",
      submit: "Start using CoinsLite",
    },
    backToSignIn: "Back to sign in",
    noMatches: "No matches",
    failedGeneric: "Something went wrong. Try again.",
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
