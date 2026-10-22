/* Deshi Drop — backend connection (Supabase).
   Leave BOTH values empty and the site runs exactly as before, in offline demo mode (built-in products, local-only cart/account).
   To go live: Supabase dashboard → Project Settings → API → copy "Project URL" and the "anon public" key below.
   The anon key is MEANT to be public (safe in this file). NEVER paste the "service_role" key here or anywhere on the website. */
window.DD_BACKEND = {
  url: '',      // e.g. 'https://abcdxyz.supabase.co'
  anonKey: ''   // e.g. 'eyJhbGciOi…'
};
