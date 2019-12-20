const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn, fork } = require('child_process');

const specsConfig = require('./apiSpecs/_specsConfig.json');
const keys = require('./secret-keys.json');

// const specUrl = process.env.npm_package_apiSpecUrl;
// const specVersion = process.env.npm_package_apiSpecVersion;
// const specFullUrl = `${specUrl}/${ specVersion || ''}`;
// const specFilePath = './apiSpecs/petStore.yaml';

const specsDirPath = './apiSpecs';
const typesDirPath = './types';

specsConfig.apiSpecs.forEach(async (spec) => {
  const specUrl = spec.url;
  const specVersion = spec.version;
  const specFileName = spec.fileName;
  const specFullUrl = `${specUrl}${ specVersion ? '/' + specVersion : '' }`;
  // const specFilePath = path.join(specsDirPath, specFileName);

  // const result = await fetchRemoteSpec(specFullUrl, specFileName)

  // console.log('written file:', result);

  // await generateFlowType();

  fetchAndGenType(specFullUrl, specFileName);
});



async function fetchAndGenType(specUrl, specFileName) {

  const result = { apiSpecPath: null, error: null };
  await fetchRemoteSpec(specUrl, specFileName, result);

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
  const sp = spawn('npx', ['swagger-to-flowtype', specFilePath, '-d', outputTypePath ], { shell: true });

  sp.stdout.on('data', (data) => {
    console.log(`Processing ${specFilePath}: ${data}`);
  });

  sp.stderr.on('data', (data) => {
    console.error(`Error on processing ${specFilePath}: ${data}`);
  });
}


async function fetchRemoteSpec (specUrl, specFileName, resultObj) {
  const promise = new Promise((resolve, reject) => {
    const webClient = (specUrl.startsWith('https://')) ? https : http;
    webClient.get(specUrl, (res) => {
      if (res.statusCode === 200) {
        let fetchError = false;

        let specFileExt;
        switch (res.headers['content-type']) {
          case 'application/yaml':
            specFileExt = '.yaml';
            break;
          case 'application/json':
            specFileExt = '.json';
            break;
          default:
            console.warn('Warning: Content-Type of response is not "application/yaml" neither "application/json". Assuming that spec is in JSON format');
            specFileExt = '.json';
        }

        const specFilePath = path.join(specsDirPath, specFileName) + specFileExt;
        const specFileWriteStream = fs.createWriteStream(specFilePath);

        specFileWriteStream.on('error', (err) => {
          fetchError = true;    // will be used in `specFileWriteStream.on('finish', . . . )` (see below),
                                // that is emitted no matter if write succeeded or not
          specFileWriteStream.close();
          reject(err);
        });

        specFileWriteStream.on('finish', () => {
          if (!fetchError) {
            specFileWriteStream.close();
            console.log(`Fetching spec from ${specUrl} succeded, spec saved in ${specFilePath}`);
            resultObj['apiSpecPath'] = specFilePath;

            resolve(specFilePath);
          }
        });

        res.pipe(specFileWriteStream);
      }
      else {
        res.setEncoding('utf8');  // frankly, this is incorrect and encoding should be inferred from response Content-Type;
                                  // but let it be for sake of simplicity
        let resBody = '';
        res.on('data', (chunk) => {
          resBody += chunk;
        });

        res.on('end', () =>{
          reject(new Error(`Error on fetching spec ${specUrl}:\n\tHTTP error code ${res.statusCode}\n\tServer response:${resBody}`));
        });
      }

      res.on('error', (err) => {
        // console.error(`Error on fetching spec from remote host: ${specUrl}`);

        reject(err);
      });
    });

  })
  .catch(err => {
    // console.error(err.message);
    resultObj['error'] = err;
  });

  // const result = await promise;
  // return result;
  await promise;
}




