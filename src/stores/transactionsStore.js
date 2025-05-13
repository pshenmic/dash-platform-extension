// import { create } from 'zustand'
// import { createJSONStorage, persist } from 'zustand/middleware'
// import { useChromeStorage } from '../hooks/useChromeStorage'
// import { ZUSTAND_TRANSACTION_STORE_KEY } from '../../constants'
//
// const storage = useChromeStorage()
//
// // Custom storage object
// const customStorage = {
//   getItem: async (name) => {
//     console.log(name, 'has been retrieved')
//     const storageState = await storage.get()
//
//     return storageState['chrome-storage-local'] ?? null
//   },
//   setItem: async (name, value) => {
//     console.log(name, 'with value', value, 'has been saved')
//
//     await storage.set({ [name]: value })
//   },
//   removeItem: async (name) => {
//     console.log(name, 'has been deleted')
//     await storage.remove(name)
//   },
// }
//
// export const useTransactionsStore = create(
//   persist(
//     (set, get) => ({
//       unsigned: [],
//       broadcasted: [],
//       addUnsigned: (transaction) => set((state) => ({ unsigned: [...state.unsigned, transaction] })),
//       addBroadcasted: (transaction) => set((state) => ({ broadcasted: [...state.broadcasted, transaction] })),
//     }),
//     {
//       name: ZUSTAND_TRANSACTION_STORE_KEY, // unique name
//       storage: createJSONStorage(() => customStorage),
//     },
//   ),
// )
//
