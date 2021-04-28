import * as Config from '@oclif/config';
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

import { PingResponse, PreviewRequest, PreviewResponse, Responses } from './models';
import { vars } from './vars';
import APIError from './error';

class BumpApi {
  protected readonly instance: AxiosInstance;

  public constructor(protected config: Config.IConfig, version: string) {
    const baseURL = `${vars.apiUrl}${vars.apiBasePath}`;
    const headers = {
      'User-Agent': version,
    };

    this.instance = axios.create({
      baseURL,
      headers,
    });

    this.initializeResponseInterceptor();
  }

  public getPing = (): Promise<PingResponse> => {
    return this.instance.get<void, PingResponse>('/ping');
  };

  public postPreview = (body?: PreviewRequest): Promise<PreviewResponse> => {
    return this.instance.post<void, PreviewResponse>('/previews', body);
  };

  private initializeResponseInterceptor = () => {
    this.instance.interceptors.response.use(this.handleResponse, this.handleError);
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private handleResponse = ({ data }: AxiosResponse<Responses>): any => data;

  private handleError = (error: AxiosError) => Promise.reject(new APIError(error));
}

export * from './models';
export { BumpApi, APIError };
