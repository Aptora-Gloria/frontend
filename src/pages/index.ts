// src/pages/index.ts

// Dashboard default export, o yüzden böyle bırakıyoruz
export { default as DashboardPage } from "./dashboard/DashboardPage";

// Login & AuthCallback **default değil**, named export (function LoginPage ...)
// Bu yüzden bunları named olarak re-export etmeliyiz:
export { LoginPage } from "./login/LoginPage";
export { AuthCallbackPage } from "./auth/callback";

// Yeni layout içindeki router için eklediğimiz sayfalar:
export { default as RepositoriesPage } from "./repositories/RepositoriesPage";
export { default as ProfilePage } from "./profile/ProfilePage";
