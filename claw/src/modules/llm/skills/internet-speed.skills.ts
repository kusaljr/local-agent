import { spawn } from "child_process";

export async function internetSpeedCheckSkill() {
  return new Promise((resolve) => {
    const proc = spawn("ping", ["-c", "4", "8.8.8.8"]);

    let output = "";
    let errorOutput = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        return resolve({
          status: "error",
          message: errorOutput || "Ping failed",
        });
      }

      const match = output.match(/= ([\d.]+)\/([\d.]+)\/([\d.]+)\//);

      if (!match) {
        return resolve({
          status: "error",
          message: "Ping parsing failed",
        });
      }

      const [, min, avg, max] = match;

      resolve({
        status: "ok",
        latency: {
          min: Number(min),
          avg: Number(avg),
          max: Number(max),
        },
      });
    });
  });
}
