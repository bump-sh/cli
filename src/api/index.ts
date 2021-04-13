import * as Config from '@oclif/config';
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

import { Ping } from './models';
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

  public getPing = (): Promise<Ping> => {
    return this.instance.get<void, Ping>('/ping');
  };

  private _initializeResponseInterceptor = () => {
    this.instance.interceptors.response.use(this._handleResponse, this._handleError);
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private _handleResponse = ({ data }: AxiosResponse<Ping>): any => data;

  private _handleError = (error: AxiosError) => Promise.reject(error);
}

export * from './models';
export { BumpApi };
