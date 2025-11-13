import { buildGitHubAuthUrl } from '@/features/auth-login/lib/buildGitHubAuthUrl';
import { Button } from '@/shared/ui/Button';

export const LoginButton = () => {
  const onClick = () => {
    window.location.href = buildGitHubAuthUrl();
  };
  return <Button onClick={onClick}>Sign in with GitHub</Button>;
};

