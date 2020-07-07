const fs = require("fs");
const path = require("path");
const util = require("util");
const { program } = require('commander');
const config = require('./config');
const errors = require('./errors');
const progress = require('./progress');
const validation = require('./validation');
const projectSettings = require('./projectsettings')
const chalk = require('chalk');
const emoji = require('node-emoji');
const Table = require('cli-table');

module.exports = {
  uploadCommand: async function (filepath, destination) {
    await module.exports.upload(filepath, destination, function(status) {
      if (status) {
        console.log(
          chalk.green(emoji.get('white_check_mark') + ' File uploaded successfully!')
        );
      }
    });
  },
  deleteCommand: async function (filepath) {
    await module.exports.delete(filepath, function(status) {
      if (status) {
        console.log(
          chalk.green(emoji.get('white_check_mark') + ' File deleted successfully!')
        );
      }
    });
  },
  delete: async function (filepath, cb) {
    cb = cb || function(){};

    validation.requireApiKey();
    validation.requireDomain(program.domain);

    let thisProjectSettings = projectSettings.get();

    let domain = program.domain || thisProjectSettings.domain;

    progress.spinner().start('Deleting file');
    let headers = {
      'X-Api-Key': config.userpref.get('apiKey')
    }
    let init = {
      headers: headers,
      method: 'DELETE'
    }
    let response = await validation.safelyFetch(config.api.baseurl + 'files/' + domain + filepath, init)
    let responseJson = await validation.safelyParseJson(response)

    progress.spinner().stop();

    switch(response.status) {
      case 200:
        cb(true);
        break;
      default:
        errors.returnServerError(response.status, responseJson);
    }
  },
  upload: async function (filepath, destination, cb) {
    cb = cb || function(){};

    validation.requireApiKey();
    validation.requireDomain(program.domain);

    let thisProjectSettings = projectSettings.get();

    let domain = program.domain || thisProjectSettings.domain;

    // Read the file
    try {
      var data = fs.readFileSync(filepath);
    } catch (err) {
      errors.returnError('An error occurred when reading the file. ' + err.message);
    }

    progress.spinner().start('Uploading file: ' + filepath);
    let headers = {
      'X-Api-Key': config.userpref.get('apiKey')
    }
    let init = {
      headers: headers,
      method: 'PUT',
      body: data
    }
    let response = await validation.safelyFetch(config.api.baseurl + 'files/' + domain + destination, init)
    let responseJson = await validation.safelyParseJson(response)

    progress.spinner().stop();

    switch(response.status) {
      case 200:
        cb(true);
        break;
      default:
        errors.returnServerError(response.status, responseJson);
    }
  }
};