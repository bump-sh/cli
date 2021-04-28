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

export interface InvalidDefinitionError {
  message?: string;
  errors: { [keys: string]: unknown };
}

export type Responses = PingResponse | PreviewResponse;

export interface PreviewRequest {
  definition: string;
  references?: Reference[];
}

export interface Reference {
  location?: string;
  content?: string;
}
