import * as Config from '@oclif/config';
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

import {
  PingResponse,
  PreviewRequest,
  PreviewResponse,
  VersionRequest,
  VersionResponse,
  DiffRequest,
  DiffResponse,
  WithDiff,
} from './models.js';
import { vars } from './vars.js';
import APIError from './error.js';

class BumpApi {
  protected readonly client: AxiosInstance;

  // Check https://oclif.io/docs/config for details about Config.IConfig
  public constructor(protected config: Config.IConfig) {
    const baseURL = `${vars.apiUrl}${vars.apiBasePath}`;
    const headers: { 'User-Agent': string; Authorization?: string } = {
      'User-Agent': vars.apiUserAgent(config.userAgent),
    };

    this.client = axios.default.create({
      baseURL,
      headers,
    });

    this.initializeResponseInterceptor();
  }

  public getPing = (): Promise<AxiosResponse<PingResponse>> => {
    return this.client.get<PingResponse>('/ping');
  };

  public getVersion = (
    versionId: string,
    token: string,
  ): Promise<AxiosResponse<VersionResponse & WithDiff>> => {
    return this.client.get<VersionResponse & WithDiff>(`/versions/${versionId}`, {
      headers: this.authorizationHeader(token),
    });
  };

  public postPreview = (
    body?: PreviewRequest,
  ): Promise<AxiosResponse<PreviewResponse>> => {
    return this.client.post<PreviewResponse>('/previews', body);
  };

  public putPreview = (
    versionId: string,
    body?: PreviewRequest,
  ): Promise<AxiosResponse<PreviewResponse>> => {
    return this.client.put<PreviewResponse>(`/previews/${versionId}`, body);
  };

  public postVersion = (
    body: VersionRequest,
    token: string,
  ): Promise<AxiosResponse<VersionResponse>> => {
    return this.client.post<VersionResponse>('/versions', body, {
      headers: this.authorizationHeader(token),
    });
  };

  public postDiff = (body: DiffRequest): Promise<AxiosResponse<DiffResponse>> => {
    return this.client.post<PreviewResponse>('/diffs', body);
  };

  public getDiff = (
    diffId: string,
    format: string,
  ): Promise<AxiosResponse<DiffResponse>> => {
    return this.client.get<DiffResponse>(`/diffs/${diffId}`, {
      params: { formats: [format] },
    });
  };

  public postValidation = (
    body: VersionRequest,
    token: string,
  ): Promise<AxiosResponse<void>> => {
    return this.client.post<void>('/validations', body, {
      headers: this.authorizationHeader(token),
    });
  };

  private initializeResponseInterceptor = () => {
    this.client.interceptors.response.use((data) => data, this.handleError);
  };

  private handleError = (error: AxiosError) => Promise.reject(new APIError(error));

  private authorizationHeader = (token: string) => {
    return { Authorization: `Basic ${Buffer.from(token).toString('base64')}` };
  };
}

export * from './models.js';
export { BumpApi, APIError };
