import * as Config from '@oclif/config';
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

import { PingRes, PreviewRes, PreviewReq, Responses } from './models';
import { vars } from './vars';

class BumpApi {
  protected readonly instance: AxiosInstance;

  public constructor(protected config: Config.IConfig) {
    const baseURL = `${vars.apiUrl}${vars.apiBasePath}`;

    this.instance = axios.create({
      baseURL,
    });

    this._initializeResponseInterceptor();
  }

  public getPing = (): Promise<PingRes> => {
    return this.instance.get<void, PingRes>('/ping');
  };

  public postPreview = (body?: PreviewReq): Promise<PreviewRes> => {
    return this.instance.post<void, PreviewRes>('/previews', body);
  };

  private _initializeResponseInterceptor = () => {
    this.instance.interceptors.response.use(this._handleResponse, this._handleError);
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private _handleResponse = ({ data }: AxiosResponse<Responses>): any => data;

  private _handleError = (error: AxiosError) => Promise.reject(error);
}

export * from './models';
export { BumpApi };
