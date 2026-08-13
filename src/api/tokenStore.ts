// Foundation-phase pragmatic choice per both blueprints (§5 BackOffice / §4 SuperOffice):
// tokens live in localStorage. Revisit if/when an httpOnly-cookie BFF lands.
const ACCESS_KEY = "vastora.accessToken";
const ACCESS_EXPIRES_KEY = "vastora.accessTokenExpiresAt";
const REFRESH_KEY = "vastora.refreshToken";

export interface StoredTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

export const tokenStore = {
  get(): StoredTokens | null {
    const accessToken = localStorage.getItem(ACCESS_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const accessTokenExpiresAt = localStorage.getItem(ACCESS_EXPIRES_KEY);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken, accessTokenExpiresAt: accessTokenExpiresAt ?? "" };
  },
  set(tokens: StoredTokens): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(ACCESS_EXPIRES_KEY, tokens.accessTokenExpiresAt);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(ACCESS_EXPIRES_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
