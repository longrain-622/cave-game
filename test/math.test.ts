function check(condition: boolean, message: string): void {
    if (!condition) {
        console.error(message);
    }
}

const openTest: boolean = false;

function main(): void {
    if (openTest) {return;}
    console.log('Begin Test.');
    console.log('End Test.');
}
main();