/* Deshi Drop — backend connection (Supabase).
   Leave BOTH values empty and the site runs exactly as before, in offline demo mode (built-in products, local-only cart/account).
   To go live: Supabase dashboard → Project Settings → API → copy "Project URL" and the "anon public" key below.
   The anon key is MEANT to be public (safe in this file). NEVER paste the "service_role" key here or anywhere on the website. */
window.DD_BACKEND = {
  url: 'https://xxqxjunlssfbnkozkncz.supabase.co/rest/v1/',      // e.g. 'https://abcdxyz.supabase.co'
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4cXhqdW5sc3NmYm5rb3prbmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NDQ1OTIsImV4cCI6MjEwODAyMDU5Mn0.aA4CA0m04yd_v6rymu2318PQDvnRN1anYSf6kcsJFS8'   // e.g. 'eyJhbGciOi…'
};
