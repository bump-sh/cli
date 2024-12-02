import {Config} from '@oclif/core'
import axios, {AxiosError, AxiosInstance, AxiosResponse} from 'axios'

import APIError from './error.js'
import {
  DiffRequest,
  DiffResponse,
  PingResponse,
  PreviewRequest,
  PreviewResponse,
  VersionRequest,
  VersionResponse,
  WithDiff,
} from './models.js'
import {vars} from './vars.js'

class BumpApi {
  protected readonly client: AxiosInstance

  public getDiff = (diffId: string, format: string): Promise<AxiosResponse<DiffResponse>> =>
    this.client.get<DiffResponse>(`/diffs/${diffId}`, {
      params: {formats: [format]},
    })

  public getPing = (): Promise<AxiosResponse<PingResponse>> => this.client.get<PingResponse>('/ping')

  public getVersion = (versionId: string, token: string): Promise<AxiosResponse<VersionResponse & WithDiff>> =>
    this.client.get<VersionResponse & WithDiff>(`/versions/${versionId}`, {
      headers: this.authorizationHeader(token),
    })

  public postDiff = (body: DiffRequest): Promise<AxiosResponse<DiffResponse>> =>
    this.client.post<PreviewResponse>('/diffs', body)

  public postPreview = (body?: PreviewRequest): Promise<AxiosResponse<PreviewResponse>> =>
    this.client.post<PreviewResponse>('/previews', body)

  public postValidation = (body: VersionRequest, token: string): Promise<AxiosResponse<void>> =>
    this.client.post<void>('/validations', body, {
      headers: this.authorizationHeader(token),
    })

  public postVersion = (body: VersionRequest, token: string): Promise<AxiosResponse<VersionResponse>> =>
    this.client.post<VersionResponse>('/versions', body, {
      headers: this.authorizationHeader(token),
    })

  public putPreview = (versionId: string, body?: PreviewRequest): Promise<AxiosResponse<PreviewResponse>> =>
    this.client.put<PreviewResponse>(`/previews/${versionId}`, body)

  private authorizationHeader = (token: string) => ({
    Authorization: `Basic ${Buffer.from(token).toString('base64')}`,
  })

  private handleError = (error: AxiosError) => Promise.reject(new APIError(error))

  private initializeResponseInterceptor = () => {
    this.client.interceptors.response.use((data) => data, this.handleError)
  }

  // Check https://oclif.io/docs/config for details about Config.IConfig
  public constructor(protected config: Config) {
    const baseURL = `${vars.apiUrl}${vars.apiBasePath}`
    const headers: {Authorization?: string; 'User-Agent': string} = {
      'User-Agent': vars.apiUserAgent(config.userAgent),
    }

    this.client = axios.create({
      baseURL,
      headers,
    })

    this.initializeResponseInterceptor()
  }
}

export {default as APIError} from './error.js'
export {BumpApi}

export * from './models.js'
