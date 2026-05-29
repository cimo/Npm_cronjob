import Fs from "fs";
import Path from "path";
import { exec } from "child_process";

// Source
import * as helperSrc from "./HelperSrc.js";
import * as model from "./Model.js";

const jobList: model.Idata[] = [];

let interval: NodeJS.Timeout | undefined = undefined;

const parseField = (field: string, max: number): number[] => {
    const resultList: number[] = [];

    const fieldSplit = field.split(",");

    for (let a = 0; a < fieldSplit.length; a++) {
        const currentField = fieldSplit[a];

        if (currentField === "*") {
            for (let b = 0; b <= max; b++) {
                resultList.push(b);
            }
        } else if (currentField.includes("/")) {
            const fieldSubSplit = currentField.split("/");
            const base = fieldSubSplit[0];
            const step = parseInt(fieldSubSplit[1]);
            const start = base === "*" ? 0 : parseInt(base);

            for (let b = start; b <= max; b += step) {
                resultList.push(b);
            }
        } else if (currentField.includes("-")) {
            const fieldSubSplit = currentField.split("-");
            let start = 0;
            let end = 0;

            for (let b = 0; b < fieldSubSplit.length; b++) {
                const num = parseInt(fieldSubSplit[b]);

                if (b === 0) {
                    start = num;
                } else {
                    end = num;
                }
            }

            for (let b = start; b <= end; b++) {
                resultList.push(b);
            }
        } else {
            const value = parseInt(currentField);

            if (!isNaN(value)) {
                resultList.push(value);
            }
        }
    }

    return resultList;
};

const matchTime = (schedule: string, currentDate: Date): boolean => {
    const [minStr, hourStr, dayStr, monthStr, weekStr] = schedule.trim().split(" ");

    const minList = parseField(minStr, 59);
    const hourList = parseField(hourStr, 23);
    const dayList = parseField(dayStr, 31);
    const monthList = parseField(monthStr, 12);
    const weekList = parseField(weekStr, 6);

    return (
        minList.includes(currentDate.getMinutes()) &&
        hourList.includes(currentDate.getHours()) &&
        dayList.includes(currentDate.getDate()) &&
        monthList.includes(currentDate.getMonth() + 1) &&
        weekList.includes(currentDate.getDay())
    );
};

const runJob = (): void => {
    const currentDate = new Date();

    for (let a = 0; a < jobList.length; a++) {
        const job = jobList[a];

        if (matchTime(job.schedule, currentDate) && job.command && job.command !== "") {
            exec(job.command, (error, stdout, stderr) => {
                if (error) {
                    helperSrc.writeLog("@cimo/cronjob - Service.ts - runJob() - exec() - error", error.message);

                    return;
                }

                if (stderr) {
                    helperSrc.writeLog("@cimo/cronjob - Service.ts - runJob() - exec() - stderr", stderr);

                    return;
                }

                if (stdout) {
                    helperSrc.writeLog("@cimo/cronjob - Service.ts - runJob() - exec() - stdout", `\n${stdout}`);
                }
            });
        }
    }
};

const readJob = (path: string, callback: () => void): void => {
    Fs.readdir(path, (error, dataList) => {
        if (error) {
            return callback();
        }

        let count = 0;

        const next = () => {
            if (count >= dataList.length) {
                return callback();
            }

            const data = dataList[count++];
            const pathData = `${path}${data}`;

            Fs.stat(pathData, (errorStat, statData) => {
                if (!errorStat && statData.isFile() && Path.extname(data) === ".json") {
                    Fs.readFile(pathData, "utf-8", (errorRead, file) => {
                        if (!errorRead && helperSrc.isJson(file)) {
                            const jsonData: model.Idata = JSON.parse(file);

                            jobList.push(jsonData);
                        }

                        next();
                    });
                } else {
                    next();
                }
            });
        };

        next();
    });
};

export const execute = (path: string): void => {
    readJob(path, () => {
        if (!interval) {
            interval = setInterval(runJob, 60000);
        }
    });
};
