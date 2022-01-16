"use-strict";

const { app } = require("electron");

const path = require("path");
const fs = require("fs");

const preferenceFileDir = path.join(app.getPath("userData"), "User", "Preferences");
const defPreferenceFilePath = path.join(preferenceFileDir, "Settings.json");

// check arguments so that there is no error thrown at runtime
function checkArgs(...args) {
  args.forEach((arg) => {
    if (arg && !args instanceof String) {
      throw new Error(`${arg} must be a String`);
    }
  });
}

// read the preference file from disk and then return an object representation
// of the file
function getPreferences(prefFileName) {
  checkArgs(prefFileName);
  let fileName = prefFileName ? path.join(preferenceFileDir, prefFileName) : defPreferenceFilePath;

  try {
    let data = fs.readFileSync(fileName, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return createPrefFile();
  }

  function createPrefFile() {
    fs.open(fileName, "wx", (err, _fd) => {
      function createPrefDirectory() {
        fs.mkdirSync(
          preferenceFileDir,
          {
            recursive: true,
          },
          function (err) {
            if (err) console.log("An error occurred while creating setttings directory");
          }
        );
      }

      if (err) {
        if (err.code === "EEXIST") return;
        else if (err.code === "ENOENT") createPrefDirectory(fileName);
        else console.log(err.code);
      } else {
        fs.writeFileSync(fileName, "{}", (err) => {
          if (err) console.log("An error occurred while writing file");
        });
      }
    });

    return {};
  }
}

// writes to file, the specific pref specified by *pref*
function setPreferences(pref, prefFileName) {
  checkArgs(pref, prefFileName);
  let fileName = prefFileName ? path.join(preferenceFileDir, prefFileName) : defPreferenceFilePath;

  const preference = JSON.stringify(pref);
  try {
    fs.writeFileSync(fileName, preference);
    return true;
  } catch (err) {
    console.error("An error occurred while writing file");
    return false;
  }
}

/**
 * Checks if the key specified by *key* is present in app preference
 
 * @param key the key to check it's existence
 */
module.exports.hasKey = function (key, prefFileName) {
  checkArgs(key, prefFileName);
  // check if object has property key
  for (let pref in getPreferences(prefFileName)) {
    if (pref === key) return true;
  }

  return false;
};

/**
 * Retrieves the state of a user preference using a key-value pair
 *
 * @param {*} prefFileName refers to file name for the preference to be use if this was set, if not, then
 *                     the default file would be used
 * @param {*} key the key in settings in which it's value would be retrieved
 * @param {*} defaultValue the default value to be retrieved if that key has never been set
 */
module.exports.getStateSync = function (key, defaultValue, prefFileName) {
  checkArgs(key, prefFileName);
  // first check if key exists
  if (this.hasKey(key, prefFileName)) {
    const dataOB = getPreferences(prefFileName);
    return `${dataOB[`${key}`]}`;
  } else return `${defaultValue}`;
};

/**
 * Retrieves the state of a user preference using a key-value pair
 *
 * @param {*} prefFileName refers to file name for the preference to be use if this was set, if not, then
 *                     the default file would be used
 * @param {*} key the key in settings in which it's value would be retrieved
 * @param {*} defaultValue the default value to be retrieved if that key has never been set
 * @returns a Promises that resolves to the value set previously or just resolves to the default value
 */
module.exports.getState = function (key, defaultValue, prefFileName) {
  return new Promise((resolve, _reject) => {
    checkArgs(key, prefFileName);
    // first check if key exists
    if (this.hasKey(key, prefFileName)) {
      const dataOB = getPreferences(prefFileName);
      resolve(`${dataOB[`${key}`]}`);
    } else resolve(`${defaultValue}`);
  });
};

/**
 * Retrieves the state of a user preference using a key-value pair
 *
 * @param {*} prefFileName refers to file name for the preference to be use if this was set, if not, then
 *                     the default file would be used
 * @param {*} key the key in settings in which it's value would be retrieved
 * @param {*} defaultValue the default value to be retrieved if that key has never been set
 * @returns a Promises that resolves to the values set previously or just resolves to an empty array
 */
module.exports.getStates = function (states, prefFileName) {
  return new Promise((resolve, reject) => {
    checkArgs(prefFileName);
    if (!states instanceof Array) {
      reject("states must be a qualified Array object");
    }
    const dataOB = getPreferences(prefFileName);
    let values = [];
    for (let key of states) {
      // first check if key exists
      if (this.hasKey(key, prefFileName)) {
        values.push(`${dataOB[`${key}`]}`);
      } else {
        values.push(null);
      }
    }
    resolve(values);
  });
};

/**
 * Sets the state of a user preference using a key-value pair
 * Note: A new key would be created after this request
 *
 * @param {*} prefFileName refers to file name for the preference to be use if this was set, if not, then
 *                     the default file would be used
 * @param {*} key the key in settings in which it's value would be retrieved
 * @param {*} value the value to be set
 */
module.exports.setStateSync = function (key, value, prefFileName) {
  checkArgs(key, prefFileName);
  let pref = getPreferences(prefFileName);
  pref[`${key}`] = `${value}`;
  return setPreferences(pref);
};

/**
 * Sets the state of a user preference using a key-value pair
 * Note: A new key would be created after this request
 *
 * @param {*} prefFileName refers to file name for the preference to be use if this was set, if not, then
 *                     the default file would be used
 * @param {*} key the key in settings in which it's value would be retrieved
 * @param {*} value the value to be set
 */
module.exports.setState = function (key, value, prefFileName) {
  return new Promise((resolve, _reject) => {
    checkArgs(key, prefFileName);
    let pref = getPreferences(prefFileName);
    pref[`${key}`] = `${value}`;
    resolve(setPreferences(pref));
  });
};

/**
 * Sets the states of a user preference using a JSON object containing key-value pairs
 *
 * @param {*} prefFileName refers to file name for the preference to be use if this was set, if not, then
 *                     the default file would be used
 * @param states an object representing the states to be synched
 * @returns the
 */
module.exports.setStates = function (states, prefFileName) {
  return new Promise((resolve, reject) => {
    let inserted = [];
    checkArgs(prefFileName);
    if (!states instanceof Object) {
      reject("states must be a qualified JSON object");
    }
    let pref = getPreferences(prefFileName);
    Object.keys(states).forEach((key) => {
      pref[`${key}`] = `${states[`${key}`]}`;
      inserted.push(pref[`${key}`]);
      return;
    });

    if (!setPreferences(pref)) return;

    resolve(inserted);
  });
};

/**
 * Removes a preference value from settings if it exists
 * Note: Trying to use *getState()* would just return the default arg set
 
 * @param {*} key the key in settings that would be deleted
 */
module.exports.deleteKey = function (key, prefFileName) {
  checkArgs(key, prefFileName);
  let pref = getPreferences();
  // check if key is present in prefs
  if (this.hasKey(key, prefFileName)) {
    delete pref[`${key}`];
  } else {
    // nothing was deleted, but still return true
    return true;
  }

  return setPreferences(pref);
};

/**
 * Retrieves the path to the app's preference file
 */
module.exports.getDefaultPreferenceFilePath = () => defPreferenceFilePath;
