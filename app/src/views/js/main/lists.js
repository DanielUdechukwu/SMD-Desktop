/* eslint-disable no-undef */
"use-strict";

window.addEventListener("DOMContentLoaded", () => {
  let WINDOW_CONTENT_STATE = State.MAIN;
  let listData = [];

  // retrieve user downloads
  window.bridgeApis.invoke("get-list-data").then((listData) => {
    const listDownloadedData = listData[0];
    const listDownloadingData = listData[1];
    const hasListDownloadedData = listData && listDownloadedData && listDownloadedData.length > 0;
    const hasListDownloadingData = listData && listDownloadingData && listDownloadingData.length > 0;

    if (hasListDownloadedData || hasListDownloadingData) {
      listDownloadedData
        ? addListItemDownloaded(listDownloadedData)
        : displayEmptyListPlaceholderById("info_decor__downloaded", true);

      listDownloadingData
        ? addListItemDownloading(listDownloadedData)
        : displayEmptyListPlaceholderById("info_decor__downloading", true);

      // Now display the populated list items
      Array.from(document.getElementsByTagName("li")).forEach((listElement) => listElement.classList.remove("gone"));
    } else {
      displayAllDecorations(true);
    }

    // display any indeterminate progress bar that exists inside main-pain's tab content
    document.querySelectorAll(".tab-content .indeterminate-progress").forEach((loader) => {
      if (loader.id != "window-data-loader") loader.classList.add("gone");
    });
  });

  // listen for event after populating the list
  registerEventListeners();
  // actions related to file downloads
  window.bridgeApis.on("download-progress-update", displayProgress);

  window.bridgeApis.on("download-list-update", (_event, args) => {
    displayEmptyListPlaceholderById("info_decor__downloading", false);
    displayEmptyListPlaceholderById("info_decor__downloaded", true);
    // append new data into current data
    addListItemDownloading(args, true);
    registerEventListeners();
    // after changing UI states, start file downloads
    window.bridgeApis.send("initiate-downloads");
  });

  function displayAllDecorations(shouldShow) {
    const info_decorations = document.querySelectorAll(".info-decor");

    info_decorations.forEach((info_decoration) =>
      shouldShow
        ? info_decoration.style.setProperty("display", "flex")
        : info_decoration.style.setProperty("display", "none")
    );
  }

  function displayEmptyListPlaceholderById(decorationId, shouldShow) {
    const decoration = document.getElementById(decorationId);
    if (shouldShow) {
      decoration.style.setProperty("display", "flex");
    } else {
      // remove .gone class if it is present
      decoration.classList.remove("gone");
      decoration.style.setProperty("display", "none");
    }
  }

  // populate the 'downloading' - list with item fetched from database
  function addListItemDownloading(data, shouldAppend) {
    const item = data[0]; // type => object (main data)
    const itemIds = data[data.length - 1]; // type => array of objects (ids)

    const uLElement = document.querySelector(".list-group__downloading");
    if (item.length > 0) uLElement.classList.remove("gone");
    // create the list items populating it with the fetched data from database

    // TODO: fix duplicate code introduced while trying to fix bug in 'add to downloading list'

    if (shouldAppend) {
      // TODO: make listData.length return the previous size instead of 0 and use position on list
      const oldDataSize = listData.length;
      const newDataSize = oldDataSize + item.length;
      // create list, append data
      for (let position = oldDataSize; position < newDataSize; position++) createList(position, itemIds);
    } else {
      // create list, don't care to append
      for (let position = 0; position < item.length; position++) createList(position, itemIds);
    }

    function createList(position, itemIds) {
      const itemId = itemIds.id;
      const listElement = document.createElement("li");
      listElement.classList.add("list-group-item", "gone"); // create but don't display yet
      // create the thumbnail element
      const thumbnailElement = document.createElement("img");
      thumbnailElement.classList.add("media-object", "pull-left");
      thumbnailElement.setAttribute("src", "app/../../../../resources/images/musical_2.png");
      // finally append those element node to the list parent node
      listElement.append(thumbnailElement);
      listElement.append(createMediaBody(itemId, item[position]));
      // append list item to list
      uLElement.append(listElement);
      listElement.classList.remove("gone");
    }

    // creates a media body element
    function createMediaBody(itemId, db_data) {
      const mediaBody = document.createElement("div");
      mediaBody.className = "media-body";
      // create the track title
      const trackTitleElement = document.createElement("strong");
      trackTitleElement.innerHTML = `${db_data["Track_Title"]}`;
      // create the message element
      const messageElement = document.createElement("p");
      messageElement.innerText = db_data["Message"];
      messageElement.classList.add("message");
      // create the icons for the media body
      const opIconContainer = document.createElement("div");
      const opIcon = document.createElement("span");
      // ... classes
      opIcon.classList.add("icon", "icon-pause", "icon-x2");
      opIconContainer.classList.add("op-icon", "not-draggable", "pull-right");
      opIconContainer.append(opIcon);

      // create the progress bar element
      const downloadProgressElement = document.createElement("div");
      downloadProgressElement.classList.add("horizontal-progress");
      downloadProgressElement.id = `download-progress-${itemId}`;
      // finally append the created element nodes as children to the parent media body node
      mediaBody.append(trackTitleElement);
      mediaBody.append(messageElement);
      mediaBody.append(opIconContainer);
      mediaBody.append(downloadProgressElement);

      return mediaBody;
    }
  }

  // populate the 'downloaded' - list with item fetched from database
  function addListItemDownloaded(item) {
    const uLElement = document.querySelector(".list-group__downloaded");
    if (item.length > 0) uLElement.classList.remove("gone");
    // create the list items populating it with the fetched data from database
    for (let i = 0; i < item.length; i++) {
      const listElement = document.createElement("li");
      listElement.classList.add("list-group-item"); // create but don't display yet
      // create the thumbnail element
      const thumbnailElement = document.createElement("img");
      thumbnailElement.classList.add("media-object", "pull-left");
      thumbnailElement.setAttribute("src", "app/../../../../resources/images/musical_2.png");
      // finally append those element node to the list parent node
      listElement.append(thumbnailElement);
      listElement.append(createMediaBody(i, item[i]));
      // append list item to list
      uLElement.append(listElement);
    }

    // creates a media body element
    function createMediaBody(position, item) {
      const mediaBody = document.createElement("div");
      mediaBody.className = "media-body";
      // create the track title
      const trackTitleElement = document.createElement("strong");
      trackTitleElement.innerText = `${position + 1}. ${item["Track_Title"]} - ${item["Track_Artists"]}`;
      // create the message element
      const messageElement = document.createElement("p");
      messageElement.innerText = item["Track_Download_Size"];
      messageElement.classList.add("message");
      // create the icons for the media body
      const opIconContainer1 = document.createElement("div");
      const opIconContainer2 = document.createElement("div");
      const opIconContainer3 = document.createElement("div");
      const opIcon1 = document.createElement("span");
      const opIcon2 = document.createElement("span");
      const opIcon3 = document.createElement("span");
      // ... classes
      opIconContainer1.classList.add("op-icon", "not-draggable", "pull-right");
      opIconContainer2.classList.add("op-icon", "not-draggable", "pull-right");
      opIconContainer3.classList.add("op-icon", "not-draggable", "pull-right");
      // ..
      opIcon1.classList.add("icon", "icon-folder", "icon-x2");
      opIcon2.classList.add("icon", "icon-trash", "icon-x2");
      opIcon3.classList.add("icon", "icon-play", "icon-x2");

      // navigate to file
      opIconContainer1.addEventListener("click", () => window.bridgeApis.send("navigate-link", "#music"));
      // delete local database entry and file on disk
      opIconContainer2.addEventListener("click", () => {
        let args = { data: item, type: Type.DOWNLOADED, mode: Mode.SINGLE };

        window.bridgeApis.invoke("delete-file", args).then((isFileDeleted) => {
          if (isFileDeleted) {
            let listItem = opIconContainer1.parentElement.parentElement;
            let listGroup = listItem.parentElement;

            listGroup.removeChild(listItem);
            if (listGroup.childNodes.length == 0) uLElement.classList.add("gone");
            displayEmptyListPlaceholderById("info_decor__downloaded", false);
          }
        });
      });

      opIconContainer3.addEventListener("click", () => window.bridgeApis.send("play-music", "default"));

      opIconContainer1.append(opIcon1);
      opIconContainer2.append(opIcon2);
      opIconContainer3.append(opIcon3);

      mediaBody.append(trackTitleElement);
      mediaBody.append(messageElement);
      mediaBody.append(opIconContainer1);
      mediaBody.append(opIconContainer2);
      mediaBody.append(opIconContainer3);

      return mediaBody;
    }
  }

  // Register all event listeners on the list section UI in here
  function registerEventListeners() {
    let navItems = document.querySelectorAll(".nav-group-item");
    const settingsPane = document.querySelector(".pane-settings");
    const mainPane = document.querySelector(".pane-main");

    navItems.forEach((navItem) => {
      const navItemChildren = Array.from(navItem.parentElement.children);

      navItem.addEventListener("click", () => {
        // don't change active state of the nav item that have the 'click' class as attribute
        const filesNavItemIndex = 1;
        const aboutNavItemIndex = navItemChildren.length - 2;
        const isFilesNavItemIndex = navItemChildren.indexOf(navItem) === filesNavItemIndex;
        const isAboutNavItemIndex = navItemChildren.indexOf(navItem) === aboutNavItemIndex;

        if (isFilesNavItemIndex || isAboutNavItemIndex) return;

        for (let x = 0; x < navItems.length; x++) {
          navItems[x].classList.remove("active");
        }

        navItem.classList.add("active");

        // toggle main and settings pane's visibility
        if (WINDOW_CONTENT_STATE != State.MAIN && navItemChildren.indexOf(navItem) == 0) {
          mainPane.classList.remove("gone");
          settingsPane.classList.add("gone");
          WINDOW_CONTENT_STATE = State.MAIN;
        } else if (
          WINDOW_CONTENT_STATE != State.SETTINGS &&
          navItemChildren.indexOf(navItem) === navItemChildren.length - 3
        ) {
          mainPane.classList.add("gone");
          settingsPane.classList.remove("gone");
          WINDOW_CONTENT_STATE = State.SETTINGS;
        }
      });
    });

    // fallback image on thumbnail load error
    document.querySelectorAll(".media-object").forEach((image) => {
      image.addEventListener("error", () => {
        image.setAttribute("src", "app/../../../../resources/images/musical_2.png");
      });
    });
  }

  window.bridgeApis.on("show-binary-download-dialog", (_event, shouldShow) => {
    let progressModal = document.querySelector(".modal-container");

    if (shouldShow) {
      progressModal.style.setProperty("display", "flex");
    } else {
      progressModal.style.setProperty("display", "none");
    }
  });

  // actions related to file downloads
  function displayProgress(_event, args) {
    const progress = args.progress;

    const elementId = `download-progress-${args.id}`;
    const progressBar = document.getElementById(elementId);
    const mediaBodyElement = progressBar.parentNode;
    // get the second child element
    const messageElement = mediaBodyElement.children[1];
    messageElement.innerText = `${progress}% downloaded`;

    progressBar.style.setProperty("--progress-anim", "none");
    progressBar.style.setProperty("--progress-width", `${progress}%`);

    if (progress === 100) finishDownloading();

    function finishDownloading() {
      const listItem = mediaBodyElement.parentElement;
      const listGroup = listItem.parentElement;

      let data = { data: { id: args.id }, type: Type.DOWNLOADING };

      window.bridgeApis.invoke("finish-downloading", data).then((isFileDeleted) => {
        if (isFileDeleted) {
          listGroup.removeChild(listItem);
          if (listGroup.childNodes.length == 0) {
            // no downloads are pending, display decorations
            listGroup.classList.add("gone");
            displayEmptyListPlaceholderById("info_decor__downloading", true);
          }
        }
      });
    }
  }
});
