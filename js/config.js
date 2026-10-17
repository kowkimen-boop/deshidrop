/* Deshi Drop — social sign-in settings.
   Leave a provider empty and its button runs in DEMO mode (signs in a placeholder user so you can
   test the flow). Fill in the IDs below to go live. Sign-in pages must be served over https://.

   GOOGLE   Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web).
            Add your site address under "Authorized JavaScript origins".
   FACEBOOK developers.facebook.com → create an app → Facebook Login → add your site domain.
   TIKTOK   developers.tiktok.com → Login Kit. TikTok only returns a one-time "code"; exchanging it for
            the user's profile needs a server (it requires your client secret), so the front-end can only
            start the redirect. Set redirectUri to the server page that finishes the login. */
window.DD_CONFIG = {
  auth: {
    google:   { clientId: '' },
    facebook: { appId: '', version: 'v21.0' },
    tiktok:   { clientKey: '', redirectUri: '' }
  }
};
