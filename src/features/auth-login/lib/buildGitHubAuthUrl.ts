export const buildGitHubAuthUrl = () => {
  const base = import.meta.env.VITE_GITHUB_OAUTH_URL;
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI;
  const scopes = import.meta.env.VITE_GITHUB_SCOPES || 'read:user';

  if (!base || !clientId || !redirectUri) {
    console.error('Missing GitHub OAuth environment variables:', {
      base,
      clientId,
      redirectUri,
    });
    throw new Error(
      'GitHub OAuth configuration is missing. Please check your .env file.'
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
  });

  return `${base}?${params.toString()}`;
};
