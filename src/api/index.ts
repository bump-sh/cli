import * as Config from '@oclif/config';
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

import { PingResponse, PreviewRequest, PreviewResponse } from './models';
import { vars } from './vars';
import APIError from './error';

class BumpApi {
  protected readonly instance: AxiosInstance;

  // Check https://oclif.io/docs/config for details about Config.IConfig
  public constructor(protected config: Config.IConfig) {
    const baseURL = `${vars.apiUrl}${vars.apiBasePath}`;
    const headers = {
      'User-Agent': config.userAgent,
    };

    this.instance = axios.create({
      baseURL,
      headers,
    });

    this.initializeResponseInterceptor();
  }

  public getPing = (): Promise<AxiosResponse<PingResponse>> => {
    return this.instance.get<PingResponse>('/ping');
  };

  public postPreview = (
    body?: PreviewRequest,
  ): Promise<AxiosResponse<PreviewResponse>> => {
    return this.instance.post<PreviewResponse>('/previews', body);
  };

  private initializeResponseInterceptor = () => {
    this.instance.interceptors.response.use((data) => data, this.handleError);
  };

  private handleError = (error: AxiosError) => Promise.reject(new APIError(error));
}

export * from './models';
export { BumpApi, APIError };
