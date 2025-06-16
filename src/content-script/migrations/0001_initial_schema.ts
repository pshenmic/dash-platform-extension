import {StorageAdapter} from "../storage/storageAdapter";

export default async function up(storageAdapter: StorageAdapter) {
    await storageAdapter.set('schema_version', {schemaVersion: 1})
}
