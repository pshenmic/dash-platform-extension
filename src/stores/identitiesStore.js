import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useChromeStorage } from '../hooks/useChromeStorage'
import { ZUSTAND_IDENTITIES_STORE_KEY } from '../ui/constants'

const storage = useChromeStorage()

// Custom storage object
const customStorage = {
  getItem: async (name) => {
    console.log(name, 'has been retrieved')
    const storageState = await storage.get(name)

    return storageState[name] ?? null
  },
  setItem: async (name, value) => {
    console.log(name, 'with value', value, 'has been saved')

    await storage.set({ [name]: value })
  },
  removeItem: async (name) => {
    console.log(name, 'has been deleted')
    await storage.remove(name)
  },
}

export const useIdentitiesStore = create(
  persist(
    (set, get) => ({
      currentIdentity: null,
      unsignedStateTransitions: [],
      identities: [],
      setIdentities: (identities) => set(() => ({ identities })),
      setCurrentIdentity: (identifier) => set(() => ({ currentIdentity: identifier })),
      setIdentityBalance: (identifier, balance) => set((state) => {
        const [identity] = state.identities.filter(identity => identity.identifier === identifier)

        return ({ identities: [...state.identities.filter(identity => identity.identifier !== identifier), {...identity, balance}] })
      }),
    }),
    {
      name: ZUSTAND_IDENTITIES_STORE_KEY, // unique name
      storage: createJSONStorage(() => customStorage),
    },
  ),
)

