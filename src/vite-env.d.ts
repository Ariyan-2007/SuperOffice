/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_MODE?: "backoffice" | "superoffice";
  readonly VITE_BUSINESS_SLUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
