import Fs from "fs";
import Path from "path";
import { exec } from "child_process";

// Source
import * as helperSrc from "./HelperSrc";
import * as model from "./Model";

const jobList: model.Idata[] = [];

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
                    helperSrc.writeLog("@cimo/cronjob - Service.ts - runJob() - exec(command)", `error: ${error.message}`);

                    return;
                }
                if (stderr) {
                    helperSrc.writeLog("@cimo/cronjob - Service.ts - runJob() - exec(command)", `stderr: ${stderr}`);

                    return;
                }

                helperSrc.writeLog("@cimo/cronjob - Service.ts - runJob() - exec(command)", `output: ${stdout}\n`);
            });
        }
    }
};

const readJob = async (path: string): Promise<void> => {
    const dataList = await Fs.promises.readdir(path);

    for (const data of dataList) {
        const pathData = `${path}${data}`;
        const statData = await Fs.promises.stat(pathData);

        if (statData.isFile() && Path.extname(data) === ".json") {
            const file = await Fs.promises.readFile(pathData, "utf-8");
            const jsonData: model.Idata = JSON.parse(file);

            jobList.push(jsonData);
        }
    }
};

export const execute = (path: string) => {
    readJob(path).then(() => {
        setInterval(runJob, 60000);
    });
};
