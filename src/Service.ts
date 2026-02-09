import Fs from "fs";
import Path from "path";
import { exec } from "child_process";

// Source
import * as helperSrc from "./HelperSrc.js";
import * as model from "./Model.js";

const jobList: model.Idata[] = [];

let interval: NodeJS.Timeout | null = null;

const parseField = (field: string, max: number): number[] => {
    const resultList: number[] = [];
    const fieldSplit = field.split(",");

    for (const field of fieldSplit) {
        if (field === "*") {
            for (let a = 0; a <= max; a++) {
                resultList.push(a);
            }
        } else if (field.includes("/")) {
            const fieldSubSplit = field.split("/");
            const base = fieldSubSplit[0];
            const step = parseInt(fieldSubSplit[1]);
            const start = base === "*" ? 0 : parseInt(base);

            for (let a = start; a <= max; a += step) {
                resultList.push(a);
            }
        } else if (field.includes("-")) {
            const fieldSubSplit = field.split("-");
            let start = 0;
            let end = 0;

            for (let a = 0; a < fieldSubSplit.length; a++) {
                const num = parseInt(fieldSubSplit[a]);

                if (a === 0) {
                    start = num;
                } else {
                    end = num;
                }
            }

            for (let a = start; a <= end; a++) {
                resultList.push(a);
            }
        } else {
            const value = parseInt(field);

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

    for (const job of jobList) {
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
                    helperSrc.writeLog("@cimo/cronjob - Service.ts - runJob() - exec() - stdout", `${stdout}\n`);
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
                        if (!errorRead) {
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
