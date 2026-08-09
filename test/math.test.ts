function check(condition: boolean, message: string): void {
    if (!condition) {
        console.error(message);
    }
}

function main(): void {
    if (false) {return;}
    console.log('Begin Test.');
    console.log('End Test.');
}
main();