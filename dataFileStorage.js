import { readFile, writeFile } from 'fs';

export const read = (filename, callback) => {
  const handleFileRead = (readErr, jsonObjectStr) => {
    if (readErr) {
      console.log('error', readErr);
      callback(readErr, null);
      return;
    }

    const jsonContentObj = JSON.parse(jsonObjectStr);
    callback(null, jsonContentObj);
  };
  readFile(filename, 'utf-8', handleFileRead);
};

export const write = (filename, jsonContentObj, callback) => {
  const jsonContentStr = JSON.stringify(jsonContentObj);

  // writing to database
  writeFile(filename, jsonContentStr, (writeErr) => {
    if (writeErr) {
      console.log('WriteErr', writeErr);
      callback(writeErr, null);
      return;
    }
    console.log('write success');
    callback(null, jsonContentStr);
  });
};

export const edit = (filename, readCallback, writeCallback) => {
  read(filename, (readErr, jsonContentObj) => {
    if (readErr) {
      console.log('readErr', readErr);
      readCallback(readErr, null);
      return;
    }

    readCallback(null, jsonContentObj);
    write(filename, jsonContentObj, writeCallback);
  });
};

export const remove = (filename, key, index, callback) => {
  edit(
    filename,
    (err, jsonContentObj) => {
      if (err) {
        console.error('Edit error', err);
        callback(err);
        return;
      }

      // Exit if key does not exist in DB
      if (!(key in jsonContentObj)) {
        console.error('Key does not exist');
        // Call callback with relevant error message to let client handle
        callback('Key does not exist');
        return;
      }

      // Add input element to target array
      jsonContentObj[key].splice(index, 1);
    },
    callback,
  );
};

export function add(filename, key, input, callback) {
  edit(
    filename,
    (err, jsonContentObj) => {
      // Exit if there was an error
      if (err) {
        console.error('Edit error', err);
        callback(err);
        return;
      }

      // Exit if key does not exist in DB
      if (!(key in jsonContentObj)) {
        console.error('Key does not exist');
        // Call callback with relevant error message to let client handle
        callback('Key does not exist');
        return;
      }

      // Add input element to target array
      jsonContentObj[key].push(input);
    },
    // Pass callback to edit to be called after edit completion
    callback,
  );
}
