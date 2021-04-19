/*
   Please see https://developers.bump.sh/ for the API documentation
   The types defined here should align with the API definition
*/
export interface PingResponse {
  pong?: string;
}

export interface PreviewResponse {
  id?: string;
  expires_at?: string;
  public_url?: string;
}

export interface Preview422Error {
  message?: string;
  errors: { [keys: string]: unknown };
}

export type Responses = PingResponse | PreviewResponse;

export interface PreviewRequest {
  definition: string;
  specification?: string;
  validation?: ValidationStrategy;
  references?: Reference[];
}

// The 'strict' strategy server side is a legacy one. We will only ask
// the server to perform a 'basic' validation from now on.
export type ValidationStrategy = 'basic' | 'strict';

export interface Reference {
  location?: string;
  content?: string;
}
