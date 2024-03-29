const fs = require("fs");
const os = require("os");
const { program } = require('commander');
const config = require('./config');
const errors = require('./errors');
const progress = require('./progress');
const projectSettings = require('./projectsettings');
const validation = require('./validation');
const tasks = require('./tasks');
const emoji = require('node-emoji');
const chalk = require('chalk');
const _colors = require('colors');
const file_system = require('fs');
const got = require('got');
const archiver = require('archiver');
const cliProgress = require('cli-progress');
const lfs = require('./lfs');

module.exports = {
  deployCommand: async function () {
    validation.requireApiKey();
    if (await validation.requireProject()) {
      if (await validation.requireDomain(program.domain)) {
        let thisProjectSettings = projectSettings.get();

        let domain = program.domain || thisProjectSettings.domain;

        let deployDir = thisProjectSettings.deployPath ? '/' + thisProjectSettings.deployPath : ''

        // LFS sync
        await lfs.sync();

        progress.spinner().start('Archiving');

        let deploymentFilename = 'deployment-' + Date.now() + '.zip';

        // Create archive
        let output = file_system.createWriteStream(os.tmpdir() + '/' + deploymentFilename);
        let archive = archiver('zip');

        output.on('close', function () {
            //console.log(archive.pointer() + ' total bytes');
            // Archive finalised
            uploadDeployment(domain, os.tmpdir() + '/' + deploymentFilename, function(taskID) {
              // Deployment has been uploaded
              progress.spinner().text = 'Uploaded';

              // Cleanup local archive
              fs.unlinkSync(os.tmpdir() + '/' + deploymentFilename);

              // Track status of remote task
              tasks.getStatus(taskID, function(status, statusText) {
                statusText = statusText || "";

                progress.spinner().stop();
            
                if (status == 3) {
                  if (statusText != "") {
                    console.log(
                      chalk.green(emoji.get('tada') + ' ' + statusText)
                    );
                  } else {
                    console.log(
                      chalk.green(emoji.get('tada') + ' Deployed!')
                    );
                  }
                } else {
                  if (status == 4) {
                    if (statusText != "") {
                      console.log(
                        chalk.red(statusText)
                      );
                    } else {
                      console.log(
                        chalk.red('An unknown error occurred during deployment')
                      );
                    }
                  }
                }
                alertTerminal();
              });
            });
        });

        archive.on('error', function(err){
            throw err;
        });

        archive.pipe(output);

        archive.glob('**/*', {
          cwd: process.cwd() + deployDir,
          ignore: ['_lfs/**']
        })
        archive.finalize();
      }
    }
  }
}

async function uploadDeployment(domain, filepath, cb) {
  cb = cb || function(){};

  // Read the file
  try {
    var data = fs.createReadStream(filepath);
  } catch (err) {
    errors.returnError('An error occurred when reading the deployment for upload. ' + err.message);
  }

  progress.spinner().text = 'Uploading';
  let headers = {
    'X-Api-Key': config.userpref.get('apiKey')
  }

  progress.spinner().stop();

  // create a new progress bar instance and use shades_classic theme
  const uploadProgressBar = new cliProgress.SingleBar({
    format: 'Uploading ' + _colors.red('{bar}') + ' {percentage}%',
    hideCursor: true,
    clearOnComplete: true
  }, cliProgress.Presets.shades_classic);

  // start the progress bar with a total value of 200 and start value of 0
  uploadProgressBar.start(1, 0);

  try {
    const response = await got.put(config.api.baseurl + 'deploy/' + domain, {
      headers: headers,
      body: data,
      responseType: 'json'
    })
    .on('uploadProgress', prog => {
      uploadProgressBar.update(prog.percent);
    });

    uploadProgressBar.stop();

    cb(response.body.taskID);
  } catch (error) {
    uploadProgressBar.stop();
    
    errors.returnServerError(error.response.statusCode, error.response.body);
	}
}

function alertTerminal() {
  process.stdout.write('\x07');
}