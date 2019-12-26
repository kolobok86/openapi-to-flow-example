const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn, fork } = require('child_process');

const specsConfig = require('./specsConfig.json');
const secKeys = require('./apiSecretKeys.json');


const specsDirPath = './apiSpecs';
const typesDirPath = './types';
const specEncoding = 'utf8';  // frankly, this is incorrect and encoding should be inferred from response Content-Type;
                              // but let it be for sake of simplicity
const jsonStringifySpace = 2; // use 2 spaces when formatting fetched spec in JSON format


specsConfig.apiSpecs.forEach(async (spec) => {
  const specUrl = spec.url;
  const specVersion = spec.version;
  const specFileName = spec.fileName;
  const specFullUrl = `${specUrl}${ specVersion ? '/' + specVersion : '' }`;
  const specApiKey = secKeys.apiSecretKeys[specUrl] || null;

  // process specs from specsConfig asynchronously
  fetchAndGenType(specFullUrl, specApiKey, specFileName);
});


async function fetchAndGenType(specUrl, specApiKey, specFileName) {

  const result = { apiSpecPath: null, error: null };
  await fetchRemoteSpec(specUrl, specApiKey, specFileName, result);

  const { apiSpecPath, error } = result;
  if (apiSpecPath) {
    const resultTypePath = path.join(typesDirPath, specFileName + '.js');
    generateFlowType(apiSpecPath, resultTypePath);
  }
  else if (error) {
    console.error(error.message);
    console.error(`Skipping spec ${specUrl}\n`);
  }
  else {
    console.error(`Unknown error on fetching ${specUrl}`);
    console.error(`Skipping spec ${specUrl}\n`);
  }
}


async function generateFlowType (specFilePath, outputTypePath) {
  // --check-required means that not-required properties will have Maybe type
  // more info: https://github.com/yayoc/swagger-to-flowtype#swagger-to-flowtype
  const sp = spawn('npx', ['swagger-to-flowtype', specFilePath, '-d', outputTypePath, '--check-required'], { shell: true });

  sp.stdout.on('data', (data) => {
    console.log(`Processing ${specFilePath}: ${data}`);
  });

  sp.stderr.on('data', (data) => {
    console.error(`Error on processing ${specFilePath}: ${data}`);
  });
}


async function fetchRemoteSpec (specUrl, specApiKey, specFileName, resultObj) {
  const promise = new Promise((resolve, reject) => {
    const webClient = (specUrl.startsWith('https://')) ? https : http;

    const reqOptions = {};
    if (specApiKey) {
      reqOptions.headers = {
        'Authorization': specApiKey
      };
    }

    webClient.get(specUrl, reqOptions, (res) => {
      res.setEncoding(specEncoding);
      let resBody = '';

      res.on('data', (chunk) => {
        resBody += chunk;
      });

      res.on('end', () =>{
        if (res.statusCode === 200) {
          let fetchError = false;
          let dataToWrite = resBody;

          let specFileExt;
          const contentType = res.headers['content-type'].toLowerCase();
          switch (true) {
            case contentType.includes('application/yaml'):
              specFileExt = '.yaml';
              break;
            case contentType.includes('application/json'):
              specFileExt = '.json';
              // format JSON spec to printable format, for simpler grabbing changes between versions
              try {
                const specDataObj = JSON.parse(resBody);
                dataToWrite = JSON.stringify(specDataObj, null, jsonStringifySpace);
              }
              catch (err) {
                console.error(`Error on parsing JSON structure of spec fetched from ${specUrl}`);
                reject(err);
              }
              break;
            default:
              console.warn('Warning: Content-Type of response is not "application/yaml" neither "application/json". Assuming that spec is in JSON format');
              specFileExt = '.json';
          }

          const specFilePath = path.join(specsDirPath, specFileName) + specFileExt;
          fs.writeFile(specFilePath, dataToWrite, specEncoding, (err) => {
            if (err) {
              console.error(`Error on writing fetched spec to file ${specFilePath}`);
              reject (err);
            }

            console.log(`Fetching spec from ${specUrl} succeded, spec saved in ${specFilePath}`);
            resultObj['apiSpecPath'] = specFilePath;
            resolve(specFilePath);
          })

        }
        else {
          // we treat response code different from 200 as error case
          reject(new Error(`Error on fetching spec ${specUrl}:\n\tHTTP error code ${res.statusCode}\n\tServer response: ${resBody}`));
        }
      });

      res.on('error', (err) => {
        console.error(`Error on fetching spec from remote host: ${specUrl}`);
        reject(err);
      });
    });

  })
  .catch(err => {
    resultObj['error'] = err;
  });

  await promise;
}
