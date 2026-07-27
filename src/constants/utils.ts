function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function notNullUndefined(val: any) {
    return (val !== null && val !== undefined);
}

export { getRandomInt, notNullUndefined }