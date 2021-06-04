import * as Config from '@oclif/config';
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

import {
  PingResponse,
  PreviewRequest,
  PreviewResponse,
  VersionRequest,
  VersionResponse,
} from './models';
import { vars } from './vars';
import APIError from './error';

class BumpApi {
  protected readonly client: AxiosInstance;

  // Check https://oclif.io/docs/config for details about Config.IConfig
  public constructor(protected config: Config.IConfig) {
    const baseURL = `${vars.apiUrl}${vars.apiBasePath}`;
    const headers: { 'User-Agent': string; Authorization?: string } = {
      'User-Agent': vars.apiUserAgent(config.userAgent),
    };

    this.client = axios.create({
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
  ): Promise<AxiosResponse<VersionResponse>> => {
    return this.client.get<VersionResponse>(`/versions/${versionId}`, {
      headers: this.authorizationHeader(token),
    });
  };

  public postPreview = (
    body?: PreviewRequest,
  ): Promise<AxiosResponse<PreviewResponse>> => {
    return this.client.post<PreviewResponse>('/previews', body);
  };

  public postVersion = (
    body: VersionRequest,
    token: string,
  ): Promise<AxiosResponse<VersionResponse>> => {
    return this.client.post<VersionResponse>('/versions', body, {
      headers: this.authorizationHeader(token),
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

export * from './models';
export { BumpApi, APIError };
