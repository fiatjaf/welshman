import {Repository, Relay} from "@welshman/util"
import type {TrustedEvent} from "@welshman/util"
import {Tracker, subscribe as baseSubscribe} from "@welshman/net"
import type {SubscribeRequest} from "@welshman/net"
import {createEventStore} from "@welshman/store"

export const env: {
  BOOTSTRAP_RELAYS: string[]
  DUFFLEPUD_URL?: string
  [key: string]: any
} = {
  BOOTSTRAP_RELAYS: [],
  DUFFLEPUD_URL: undefined,
}

export const repository = new Repository<TrustedEvent>()

export const events = createEventStore(repository)

export const relay = new Relay(repository)

export const tracker = new Tracker()

export const subscribe = (request: SubscribeRequest) => {
  const sub = baseSubscribe({delay: 50, authTimeout: 3000, ...request})

  sub.emitter.on("event", (url: string, e: TrustedEvent) => {
    repository.publish(e)
  })

  return sub
}

export const load = (request: SubscribeRequest) =>
  new Promise<TrustedEvent[]>(resolve => {
    const sub = subscribe({closeOnEose: true, timeout: 3000, ...request})
    const events: TrustedEvent[] = []

    sub.emitter.on("event", (url: string, e: TrustedEvent) => events.push(e))
    sub.emitter.on("complete", () => resolve(events))
  })

export const loadOne = (request: SubscribeRequest) =>
  new Promise<TrustedEvent | null>(resolve => {
    const sub = subscribe({closeOnEose: true, timeout: 3000, ...request})

    sub.emitter.on("event", (url: string, event: TrustedEvent) => {
      resolve(event)
      sub.close()
    })

    sub.emitter.on("complete", () => {
      resolve(null)
    })
  })
