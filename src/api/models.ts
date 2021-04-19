export interface PingRes {
  pong?: string;
}

export interface PreviewRes {
  id?: string;
  expires_at?: string;
  public_url?: string;
}

export type Responses = PingRes | PreviewRes;

export interface PreviewReq {
  definition: string;
  specification?: string;
  validation?: ValidationStrategy;
  references?: Reference[];
}

type ValidationStrategy = 'basic' | 'strict';

export interface Reference {
  location?: string;
  content?: string;
}
