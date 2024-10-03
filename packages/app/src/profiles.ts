import {derived, readable} from 'svelte/store'
import {readProfile, displayProfile, displayPubkey, PROFILE} from '@welshman/util'
import type {SubscribeRequestWithHandlers} from "@welshman/net"
import type {PublishedProfile, TrustedEvent} from "@welshman/util"
import {deriveEventsMapped, withGetter} from '@welshman/store'
import {repository, load} from './core'
import {collection} from './collection'
import {loadRelaySelections} from './relaySelections'

export const profiles = withGetter(
  deriveEventsMapped<PublishedProfile>(repository, {
    filters: [{kinds: [PROFILE]}],
    eventToItem: readProfile,
    itemToEvent: item => item.event,
  })
)

export const {
  indexStore: profilesByPubkey,
  deriveItem: deriveProfile,
  loadItem: loadProfile,
  getItem: getProfile,
} = collection({
  name: "profiles",
  store: profiles,
  getKey: profile => profile.event.pubkey,
  load: async (pubkey: string, request: Partial<SubscribeRequestWithHandlers> = {}) => {
    const filters = [{kinds: [PROFILE], authors: [pubkey]}]

    // Attempt to load the user profile right away, regardless of whether we have relays,
    // since profiles are crucial to UX
    load({...request, filters})

    // Load relay selections as quickly as possible, moving on to retrying profiles with
    // better selections the moment we have a result, even if it's outdated
    await new Promise<void>(resolve => {
      loadRelaySelections(pubkey, {
        onEvent: (event: TrustedEvent) => {
          resolve()
        }
      })
    })

    await load({...request, filters})
  },
})

export const displayProfileByPubkey = (pubkey: string | undefined) =>
  pubkey
    ? displayProfile(profilesByPubkey.get().get(pubkey), displayPubkey(pubkey))
    : ""

export const deriveProfileDisplay = (pubkey: string | undefined) =>
  pubkey
    ? derived(deriveProfile(pubkey), $profile => displayProfile($profile, displayPubkey(pubkey)))
    : readable("")
