import * as Config from '@oclif/config';
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { CLIError } from '@oclif/errors';

import { Ping } from './models';
import { vars } from './vars';

export class APIError extends CLIError {
  http: AxiosError;

  constructor(httpError: AxiosError) {
    super(httpError);
    this.http = httpError;
  }
}

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

  private _handleError = (error: AxiosError) => Promise.reject(new APIError(error));
}

export * from './models';
export { BumpApi };
