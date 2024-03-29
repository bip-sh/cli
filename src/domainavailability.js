const account = require('./account');
const config = require('./config');
const errors = require('./errors');
const progress = require('./progress');
const validation = require('./validation');
const chalk = require('chalk');
const emoji = require('node-emoji');
const domain = require('./domain');

module.exports = {
  get: async function (domainName, cb) {
    cb = cb || function(){};

    validation.requireApiKey();

    let headers = {
      'X-Api-Key': config.userpref.get('apiKey')
    }
    let init = {
      headers: headers,
      method: 'GET'
    }
    let response = await validation.safelyFetch(config.api.baseurl + 'domains/checkavailability/' + domainName, init)
    let responseJson = await validation.safelyParseJson(response)

    switch(response.status) {
      case 200:
        cb(responseJson);
        break;
      case 400:
        progress.spinner().stop();

        if (responseJson.validCardAttached == false) {
          console.log(
            chalk.yellow(emoji.emojify(responseJson.message))
          );
          account.setupPaymentCommand();
        } else {
          console.log(
            chalk.red(emoji.emojify(responseJson.message))
          );
        }
        if (responseJson.domainAvailable == false) {
          domain.createCommand();
        }
        break;
      default:
        errors.returnServerError(response.status, responseJson);
    }
  }
};