/*
   Please see https://developers.bump.sh/ for the API documentation
   The types defined here should align with the API definition
*/
export interface PingResponse {
  pong?: string;
}

export interface PreviewResponse {
  id: string;
  expires_at?: string;
  public_url?: string;
}

export interface InvalidDefinitionError {
  message?: string;
  errors: { [keys: string]: unknown };
}

export interface PreviewRequest {
  definition: string;
  references?: Reference[];
}

export interface Reference {
  location?: string;
  content?: string;
}

export interface VersionRequest {
  documentation: string;
  definition: string;
  hub?: string;
  documentation_name?: string;
  auto_create_documentation?: boolean;
  references?: Reference[];
  unpublished?: boolean;
  previous_version_id?: string;
}

export interface VersionResponse {
  id: string;
  doc_public_url?: string;
}

export interface WithDiff {
  diff_public_url?: string;
  diff_summary?: string;
  diff_markdown?: string;
  diff_details?: DiffItem[];
  diff_breaking?: boolean;
}

export interface DiffRequest {
  definition: string;
  references?: Reference[];
  previous_definition: string;
  previous_references?: Reference[];
}

export interface DiffResponse {
  id: string;
  public_url?: string;
  text?: string;
  markdown?: string;
  details?: DiffItem[];
  breaking?: boolean;
}

export interface DiffItem {
  id: string;
  name: string;
  status: string;
  type: string;
  breaking: boolean;
  children: DiffItem[];
}
