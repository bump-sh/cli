import debug from 'debug'

import {BumpApi} from '../api/index.js'
import {WorkflowVersionRequest, WorkflowVersionResponse} from '../api/models.js'
import {API} from '../definition.js'

export class WorkflowDeploy {
  private _bump!: BumpApi

  public constructor(bumpClient: BumpApi) {
    this._bump = bumpClient
  }

  protected async createWorkflowVersion(
    mcpServer: string,
    request: WorkflowVersionRequest,
    token: string,
  ): Promise<WorkflowVersionResponse | undefined> {
    const response = await this._bump.postMCPServerDeploy(mcpServer, request, token)
    let version: WorkflowVersionResponse | undefined

    switch (response.status) {
      case 204: {
        break // MCP server workflow document already exists
      }

      case 201: {
        version = response.data
        break
      }

      default: {
        this.d(`API status response was ${response.status}. Expected 201 or 204.`)
        throw new Error('Unexpected server response. Please contact support at https://bump.sh if this error persists')
      }
    }

    return version
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  d(formatter: any, ...args: any[]): void {
    return debug(`bump-cli:core:deploy`)(formatter, ...args)
  }

  public async run(
    workflowDefinition: API,
    mcpServer: string,
    token: string,
  ): Promise<WorkflowVersionResponse | undefined> {
    let version: WorkflowVersionResponse | undefined

    const request: WorkflowVersionRequest = {
      definition: workflowDefinition.rawDefinition,
    }

    // eslint-disable-next-line prefer-const
    version = await this.createWorkflowVersion(mcpServer, request, token)

    return version
  }
}
