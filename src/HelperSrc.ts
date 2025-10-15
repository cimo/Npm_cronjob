export const writeLog = (tag: string, value: string | Record<string, unknown> | Error): void => {
    // eslint-disable-next-line no-console
    console.log(`WriteLog => ${tag}: `, value);
};
