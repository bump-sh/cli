import axios from 'axios';

import { Ping } from './models';

function api<T>(url: string): Promise<T> {
  return axios
    .get(url)
    .then((response) => {
      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.statusText);
      }
      return response;
    })
    .then((data) => {
      return data.data;
    });
}

function getPing(): Promise<Ping> {
  return api<Ping>('http://localhost:3000/api/v1/ping');
}

export * from './models';
export { getPing };
