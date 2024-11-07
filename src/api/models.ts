/*
   Please see https://developers.bump.sh/ for the API documentation
   The types defined here should align with the API definition
*/
export interface PingResponse {
  pong?: string
}

export interface PreviewResponse {
  expires_at?: string
  id: string
  public_url?: string
}

export interface InvalidDefinitionError {
  errors: {[keys: string]: unknown}
  message?: string
}

export interface PreviewRequest {
  definition: string
  references?: Reference[]
}

export interface Reference {
  content?: string
  location?: string
}

export interface VersionRequest {
  auto_create_documentation?: boolean
  branch_name?: string
  definition: string
  documentation: string
  documentation_name?: string
  hub?: string
  previous_version_id?: string
  references?: Reference[]
  unpublished?: boolean
}

export interface VersionResponse {
  doc_public_url?: string
  id: string
}

export interface WithDiff {
  diff_breaking?: boolean
  diff_details?: DiffItem[]
  diff_markdown?: string
  diff_public_url?: string
  diff_summary?: string
}

export interface DiffRequest {
  definition: string
  expires_at?: string
  previous_definition: string
  previous_references?: Reference[]
  references?: Reference[]
}

export interface DiffResponse {
  breaking?: boolean
  details?: DiffItem[]
  html?: string
  id: string
  markdown?: string
  public_url?: string
  text?: string
}

export interface DiffItem {
  breaking: boolean
  children: DiffItem[]
  id: string
  name: string
  status: string
  type: string
}
