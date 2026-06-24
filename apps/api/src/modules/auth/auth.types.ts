export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface PublicUser {
  id: string;
  username?: string;
  displayName?: string;
}
