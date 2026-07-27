import { WorldArchive, SaveEntry } from "../types/worldArchive.js";
import "localforage";

// localforage 的 UMD 包通过 importmap 加载后只设置 window.localforage，无 default export
declare const localforage: LocalForage;

export async function loadGameFromLocal(key: string): Promise<WorldArchive | null> {
    try {
        const archive = await localforage.getItem<WorldArchive>(key);
        return archive;
    } catch (error) {
        console.error('cannot read your world!', error);
        return null;
    }
}

/** 获取所有存档条目的元信息列表 */
export async function getAllSaveEntries(): Promise<SaveEntry[]> {
    try {
        return await localforage.getItem<SaveEntry[]>('saveIndex') || [];
    } catch (error) {
        console.error('cannot read save index!', error);
        return [];
    }
}
