export class Vars {
  get host(): string {
    return this.envHost || 'bump.sh';
  }

  get envHost(): string | undefined {
    return process.env.BUMP_HOST;
  }

  get apiUrl(): string {
    return this.host.startsWith('http') ? this.host : `https://${this.host}`;
  }

  get apiBasePath(): string {
    return '/api/v1';
  }
}

export const vars = new Vars();
