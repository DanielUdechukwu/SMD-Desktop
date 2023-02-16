"use-strict";

const { downloadMatchingTrack } = require("../server/youtube-dl");
const { States } = require("../database/constants");

/**
 * A single Download Task
 *
 * @param {JSON} options { link, title }
 */
module.exports = function (options) {
  let state = States.INACTIVE;
  let { targetWindow } = options;

  async function wait() {
    state = States.PENDING;
    return await registerDownloadOp();
  }

  function pause() {
    state = States.PAUSED;
    downloadStream?.pause();
  }

  function resume() {
    // if (state !== States.PENDING || state !== States.PAUSED) {
    //   throw new Error("Illegal download state, cannot resume a download that wasn't previously running");
    // }
    state = States.ACTIVE;
    downloadStream?.resume();
  }

  function cancel() {
    state = States.INACTIVE;
    downloadStream?.destroy();
  }

  async function start() {
    if (state == States.ACTIVE) {
      throw new Error("Download task is already active");
    } else {
      state = States.ACTIVE;
      return await registerDownloadOp();
    }
  }

  async function registerDownloadOp() {
    let progressEmitter = await downloadMatchingTrack(options.request);

    console.log(progressEmitter);
    
    progressEmitter.on("binaries-downloading", () => targetWindow.webContents.send("show-binary-download-dialog"));
    progressEmitter.on("binaries-downloaded", () => targetWindow.webContents.send("close-binary-download-dialog"));
    progressEmitter.on("progress", (progress) => {
      console.log(progress.percent);

      targetWindow.webContents.send("download-progress-update", {
        id: 0,
        progress: progress.percent,
        totalSize: progress.totalSize
      });
    });

    progressEmitter.on("error", (err) => {
      console.error(err);
    });

    return progressEmitter;
  }

  return { pause, resume, wait, cancel, start };
};
