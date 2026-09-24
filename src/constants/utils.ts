export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 类型守卫：为真时把 T | null | undefined 收窄成 T，读档处可直接跟非空分支
export function notNullUndefined<T>(val: T | null | undefined): val is T {
    return (val !== null && val !== undefined);
}
