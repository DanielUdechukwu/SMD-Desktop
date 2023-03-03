"use-strict";

const { ipcMain, dialog } = require("electron");
const ytdl = require("../main/server/youtube-dl");
const spotifyDl = require("../main/server/spotify-dl");
const downloader = require("../main/downloads/downloader");
const { Type, States } = require("../main/database/constants");

module.exports = function (settings, browsers, database) {
  const { downloadWindow, searchWindow, mainWindow } = browsers;
  const { getSpotifyLinkData } = spotifyDl(settings);

  let downloadQuery;
  const DEFAULT_CONCURRENCY = 2;
  const WHITE_SPACE = " ";
  let downloadTasks = [];

  // TODO: change settings.getStateSync to use promises
  const fileDownloader = downloader({
    targetWindow: mainWindow,
    maxParallelDownloads: settings.getStateSync("max-parallel-download", DEFAULT_CONCURRENCY)
  });

  // search download details window
  ipcMain.on("show-search-download-window", (_event, searchQuery) => {
    if (searchQuery) downloadQuery = searchQuery;
    searchWindow.init();
  });

  // download acton click
  ipcMain.on("search-click-event", (_event, args) => {
    downloadQuery = args[1];

    downloadWindow.getWindow()?.close();
    if (args[0] === "proceed-download") {
      searchWindow.init();
    }
  });

  // request to search for tracks to download
  ipcMain.handle("search-tracks", async () => {
    const errorMessage = "Uh-oh!! We couldn't find any tracks";

    if (downloadQuery.type == "search") {
      let searchResults;
      try {
        // Wrap the search results in an array, because the list requires an array as result
        searchResults = await ytdl.searchMatchingTracks(downloadQuery.value);
        return searchResults ? Array.of(searchResults) : errorMessage;
      } catch (err) {
        console.error(err);
        return "An Unknown Error Occurred";
      }
    } else if (downloadQuery.type == "track") {
      try {
        const spotifyLinkData = await getSpotifyLinkData();
        // description: { songTitle, artistNames: [] }
        const trackDescription = spotifyLinkData.description;
        const searchQuery = `${trackDescription.songTitle} ${trackDescription.artistNames.join(WHITE_SPACE)}`;
        const searchResults = await ytdl.searchMatchingTracks(searchQuery);
        return searchResults ? Array.of(searchResults) : errorMessage;
      } catch (err) {
        console.error(err);
        return "An Unknown Error Occurred";
      }
    } else {
      const tracks = downloadQuery.description.trackCollection;
      // map track object to reasonable search query ([Song title] [Artist name])
      const getSearchQuery = () => tracks.map((track) => `${track.songTitle} ${track.artistNames.join(WHITE_SPACE)}`);
      // transform search queries to search promise
      const queryPromises = getSearchQuery().map((searchQuery) => ytdl.searchMatchingTracks(searchQuery));
      // resolve and return search queries
      try {
        return await Promise.all(queryPromises);
      } catch (err) {
        console.error(err);
        return "An Unknown Error Occurred";
      }
    }
  });

  // download click events
  ipcMain.on("download-click-event", async (_event, args) => {
    searchWindow.getWindow()?.close();

    if (args[0] === "proceed-download") {
      const searchQueryResults = args[1];

      const downloadData = searchQueryResults.map((searchQueryResult) => ({
        TrackTitle: searchQueryResult.videoTitle,
        TrackUrl: searchQueryResult.videoUrl,
        TrackPlaylistTitle: "-",
        TrackArtists: "-",
        ErrorOccurred: false,
        DownloadState: States.ACTIVE,
        DownloadProgress: 0,
        DownloadedSize: "Unknown",
        TrackDownloadSize: "Unknown",
        Message: "Download in progress..."
      }));

      // TODO find out the reason why after inserting more that two items in the database, later sends an undefined to the UI

      try {
        const insertedDataColumnIds = await database.addDownloadData({
          type: Type.DOWNLOADING,
          data: downloadData
        });

        // return console.log(require("util").inspect(searchQueryResults));

        downloadTasks = fileDownloader.enqueueTasks(insertedDataColumnIds, searchQueryResults);

        if (insertedDataColumnIds) {
          // update download list UI, with current pending download data]
          mainWindow.getWindow()?.send("download-list-update", [downloadData, insertedDataColumnIds]);
        } else {
          // probably some write error to the database
          dialog.showErrorBox(
            "Unknown Error Occurred",
            "Check if there is enough space on disk, which is required to save data"
          );
        }
      } catch (error) {
        console.log(error);
        dialog.showErrorBox("Unknown Error Occurred", "That's all we know for now");
      }
    }
  });

  ipcMain.on("initiate-downloads", async () => {
    const downloadStream = fileDownloader.initiateQueuedDownloads();
    setupTaskQueueMessaging();

    function setupTaskQueueMessaging() {
      // eslint-disable-next-line no-unused-vars
      downloadStream.forEach((_progressEmitter) => {
        // set up messenger
      });
      // clear task queue, downloads are now active
      fileDownloader.clearTaskQueue();
    }
  });

  // eslint-disable-next-line no-unused-vars
  ipcMain.handle("pause", async (_event, _args) => {});

  ipcMain.handle("pause-all", async () => {
    downloadTasks.forEach((task) => task.pause());
  });

  ipcMain.handle("resume", async (_event, args) => {
    const { listPos } = args;
    downloadTasks[listPos].resume();
  });

  ipcMain.handle("resume-all", async () => {
    downloadTasks.forEach((task) => task.resume());
  });

  ipcMain.handle("cancel", async (_event, args) => {
    const { listPos } = args;
    downloadTasks[listPos].cancel();
  });

  ipcMain.handle("cancel-all", async () => {
    downloadTasks.forEach((task) => task.cancel());
  });
};
