import { WorldArchive } from "../types/worldArchive.js";

export let readingWorld: WorldArchive | null = null;
export let coverWhenSave: boolean = false;

export function setReadingWorld(val: WorldArchive) {
    readingWorld = val;
    if (readingWorld !== null) {
        coverWhenSave = true;
    }
}