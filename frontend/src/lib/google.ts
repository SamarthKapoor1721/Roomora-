// OAuth web client IDs are public identifiers. Keep this Roomora client as the
// default so a Vercel build does not silently remove Google sign-in when the
// build-time environment variable is missing.
export const googleClientId =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ||
  '837905525311-rg905kb4o0mn3e92k0ul9187qoa0766k.apps.googleusercontent.com';
