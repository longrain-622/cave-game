// only logic function

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function notNullUndefined<T>(val: T | null | undefined): val is T {
    return (val !== null && val !== undefined);
}
