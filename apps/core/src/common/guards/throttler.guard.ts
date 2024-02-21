import type { ExecutionContext } from '@nestjs/common'
import type { ThrottlerOptions } from '@nestjs/throttler'
import type { FastifyBizRequest } from '~/transformers/get-req.transformer'

import { Injectable } from '@nestjs/common'
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler'

import { getNestExecutionContextRequest } from '~/transformers/get-req.transformer'
import { getIp } from '~/utils'

@Injectable()
export class ExtendThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = getNestExecutionContextRequest(context)

    if (req.user) {
      return true
    }
    return super.shouldSkip(context)
  }

  protected async getTracker(req: FastifyBizRequest) {
    return getIp(req.raw)
  }
}

export class WsExtendThrottlerGuard extends ExtendThrottlerGuard {
  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: ThrottlerOptions,
  ): Promise<boolean> {
    const client = context.switchToWs().getClient()
    const ip = client._socket.remoteAddress
    const key = this.generateKey(context, ip, throttler.name || 'ws-default')
    const { totalHits } = await this.storageService.increment(key, ttl)

    console.log('totalHits', totalHits)
    if (totalHits > limit) {
      throw new ThrottlerException()
    }

    return true
  }
}
