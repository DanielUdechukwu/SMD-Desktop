"use-strict";

const SpotifyWebApi = require("spotify-web-api-node");
const authorize = require("./authorize");
const { dialog, clipboard } = require("electron");
const { SpotifyURLType, getSpotifyURLType } = require("../../main/util/sp-util");

module.exports = function (settings) {
  let auth = authorize(settings);
  let spotifyApi = new SpotifyWebApi();
  const MAX_NUMBER_OF_RETRIES = 3;

  /**
   * starts album download
   *
   * @param  {string} albumUrl the album identifier to be used in download
   * @param {number} limit the maximum number of items to fetch
   * @throws error if error occurred while fetching data, this can be caused by network
   */
  async function performAlbumSearchAction(albumUrl, limit = 50) {
    let album = albumUrl.substring("https://open.spotify.com/album/".length, albumUrl.length);
    let data, dataReceived;

    for (let x = 0; x <= MAX_NUMBER_OF_RETRIES; x++) {
      try {
        data = await spotifyApi.getAlbumTracks(album, { limit });
        dataReceived = true;
        break;
      } catch (err) {
        await auth.refreshSpotifyAccessTokenWithErrorHandler();
      }
    }

    if (!dataReceived) return "An error occurred while retrieving album data";

    const body = data.body;
    const tracks = body["tracks"].items;
    const name = body["name"];
    const thumbnails = body["images"].map((thumbnail) => thumbnail.url);

    let trackCollection = [];

    tracks.forEach((track) => {
      let songTitle = track["name"];
      let artists = track["artists"];
      let artistNames = artists.map((artist) => artist["name"]);
      let thumbnails = track["images"];
      trackCollection.push({ thumbnails, songTitle, artistNames });
    });
    
    return {
      type: SpotifyURLType.ALBUM,
      description: { thumbnails, name, trackCollection }
    };
  }

  /**
   * starts artist download
   *
   * @param {string} _artistUrl the artist identifier to be used in download
   * @throws error if error occurred while fetching data, this can be caused by network
   */
  async function performArtistSearchAction(_artistUrl) {
    return "Artist URL support coming soon, try again later";
  }

  /**
   * starts playlist download
   *
   * @param {string} playlistUrl the playlist identifier to be used in download
   * @throws error if error occurred while fetching data, this can be caused by network
   */
  async function performPlaylistSearchAction(playlistUrl) {
    let playlist = playlistUrl.substring("https://open.spotify.com/playlist/".length, playlistUrl.length);
    let data, dataReceived;

    for (let x = 0; x <= MAX_NUMBER_OF_RETRIES; x++) {
      try {
        data = await spotifyApi.getPlaylist(playlist);
        dataReceived = true;
        break;
      } catch (err) {
        await auth.refreshSpotifyAccessTokenWithErrorHandler();
      }
    }

    if (!dataReceived) return "An error occurred while retrieving playlist data";

    const body = data.body;
    const name = body["name"];
    const tracks = body["tracks"];
    const thumbnails = body["images"].map((thumbnail) => thumbnail.url);

    let trackCollection = tracks["items"]
      .map((i) => i.track)
      .map((tr) => ({ songTitle: tr["name"], artistNames: tr["artists"].map((artist) => artist.name) }));

    return {
      type: SpotifyURLType.PLAYLIST,
      description: { thumbnails, name, trackCollection }
    };
  }

  /**
   * starts track download
   *
   * @param {string} track the track identifier to be used in download
   * @throws error if error occurred while fetching data, this can be caused by network
   */
  async function performTrackSearchAction(trackUrl) {
    let track = trackUrl.substring("https://open.spotify.com/track/".length, trackUrl.length);
    let data, dataReceived;

    for (let x = 0; x <= MAX_NUMBER_OF_RETRIES; x++) {
      try {
        data = await spotifyApi.getTrack(track);
        dataReceived = true;
        break;
      } catch (err) {
        await auth.refreshSpotifyAccessTokenWithErrorHandler();
      }
    }

    if (!dataReceived) return "An Error occurred while retrieving track data";

    const body = data.body;
    let songTitle = body["name"];
    let artists = body["artists"];
    let artistNames = [];

    artistNames = artists.map((artist) => artist["name"]);

    return {
      type: SpotifyURLType.TRACK,
      description: { songTitle, artistNames }
    };
  }

  /**
   * @param {string} urlType the url type as specified by `SpotifyURLType`
   *
   * @returns an object with the requested Spotify data
   */
  async function getSpotifyLinkData(urlType) {
    let data, spotifyURLType;
    let clipboardContent = clipboard.readText();

    try {
      spotifyURLType = urlType || getSpotifyURLType(clipboardContent);
    } catch (error) {
      // display modal dialog with details of error
      dialog.showErrorBox(
        "Clipboard content not a Spotify link",
        "Clipboard content has changed, go to Spotify and copy link again, then click 'Paste URL'"
      );

      return error.message;
    }

    let [spotifyUserClientId, spotifyClientSecret, spotifyAccessToken, spotifyRefreshToken] = await settings.getStates([
      "spotify-user-client-id",
      "spotify-user-client-secret",
      "spotify-access-token",
      "spotify-refresh-token"
    ]);

    spotifyApi.setClientId(spotifyUserClientId);
    spotifyApi.setClientSecret(spotifyClientSecret);
    spotifyApi.setAccessToken(spotifyAccessToken);
    spotifyApi.setRefreshToken(spotifyRefreshToken);

    if (clipboardContent.match(/[https://open.spotify.com]/)) {
      switch (spotifyURLType) {
        case SpotifyURLType.TRACK:
          data = performTrackSearchAction(clipboardContent);
          break;
        case SpotifyURLType.ALBUM:
          data = performAlbumSearchAction(clipboardContent);
          break;
        case SpotifyURLType.ARTIST:
          data = performArtistSearchAction(clipboardContent);
          break;
        case SpotifyURLType.PLAYLIST:
          data = performPlaylistSearchAction(clipboardContent);
          break;
        default:
          throw new Error(`${spotifyURLType} link is either incomplete or is not supported yet`);
      }
    } else {
      // display modal dialog with details of error
      dialog.showErrorBox(
        "Clipboard content not a Spotify link",
        "Clipboard content has changed, go to Spotify and copy link, then click 'Paste URL'"
      );
    }

    return data;
  }

  return {
    spotifyApi,
    performAlbumSearchAction,
    performArtistSearchAction,
    performPlaylistSearchAction,
    performTrackSearchAction,
    getSpotifyLinkData
  };
};
