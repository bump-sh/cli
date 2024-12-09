export class Vars {
  get apiBasePath(): string {
    return '/api/v1'
  }

  get apiUrl(): string {
    return this.host.startsWith('http') ? this.host : `https://${this.host}`
  }

  get envHost(): string | undefined {
    return process.env.BUMP_HOST
  }

  get host(): string {
    return this.envHost || 'bump.sh'
  }

  apiUserAgent(base: string): string {
    const content = [base, process.env.BUMP_USER_AGENT].filter(Boolean)
    return content.join(' ')
  }
}

export const vars = new Vars()
