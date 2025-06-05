import {StorageAdapter} from "./storageAdapter";

export class ExtensionStorageAdapter implements StorageAdapter {
    get = async (key: string): Promise<object> => {
        const retrieved = await chrome.storage.local.get([key])

        return retrieved[key] || {}
    };
    set = async (key: string, value: object): Promise<void> => {
        await chrome.storage.local.set({[key]: value})
    };
}
