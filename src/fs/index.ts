import * as fs from 'fs';
import { promisify } from 'util';
import * as YAML from 'yaml';
import axios from 'axios';

import { API } from '../definitions';

async function fetch(path: string): Promise<string> {
  if (new RegExp('^https?://').test(path)) {
    return axios.get<string>(path).then((response) => response.data);
  } else {
    return promisify(fs.readFile)(path, {
      encoding: 'UTF-8',
    });
  }
}

async function loadAPI(path: string): Promise<API> {
  return fetch(path).then((specContent) => {
    return new API(YAML.parse(specContent));
  });
}

export { loadAPI, API };
