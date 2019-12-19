const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const specsConfig = require('./apiSpecs/_specsConfig.json');
const keys = require('./secret-keys.json');

// const specUrl = process.env.npm_package_apiSpecUrl;
// const specVersion = process.env.npm_package_apiSpecVersion;
// const specFullUrl = `${specUrl}/${ specVersion || ''}`;
// const specFilePath = './apiSpecs/petStore.yaml';

const specsDirPath = './apiSpecs';

specsConfig.apiSpecs.forEach(async (spec) => {
  const specUrl = spec.url;
  const specVersion = spec.version;
  const specFileName = spec.fileName;
  const specFullUrl = `${specUrl}/${ specVersion || ''}`;
  const specFilePath = path.join(specsDirPath, specFileName);

  const result = await fetchRemoteSpec(specFullUrl, specFilePath)

  console.log('written file:', result);

  await generateFlowType();
});


async function generateFlowType (specFilePath, typePath) {
  const sp = spawn('echo', ['1']);
}


async function fetchRemoteSpec (specUrl, specFilePath) {

  const promise = new Promise((resolve, reject) => {

    const webClient = (specUrl.startsWith('https://')) ? https : http;
    let fetchError = false;


    // ToDo add inferring file extension by response Content-Type
    const specFileWriteStream = fs.createWriteStream(specFilePath);

    specFileWriteStream.on('error', (err) => {
      fetchError = true;
      console.log('Error on writing spec to local file:');
      console.log(err);
      specFileWriteStream.close();

      reject(err);
      // process.exit();
    });

    specFileWriteStream.on('finish', () => {
      if (fetchError) {
        console.log(`Spec fetch failed!`);
        reject(new Error('Spec fetch failed!'));
      } else {
        console.log(`Spec fetch succeded, spec saved in ${specFilePath}`);
        specFileWriteStream.close();

        resolve(specFilePath);
      }

      // process.exit(0);
    });

    webClient.get(specUrl, (res) => {
      if (res.statusCode === 200) {
        res.pipe(specFileWriteStream);
      } else {
        console.log(`Error on fetching spec: HTTP error code ${res.statusCode}`);
        // res.pipe(process.stdout);

        res.on('end', () =>{
          // process.exit();
        });
        reject(new Error('Error on fetching spec: HTTP error code ${res.statusCode}'));
      }

      res.on('error', (err) => {
        console.log(`Error on fetching spec from remote host:`);
        console.log(err);
        specFileWriteStream.close();
        // process.exit();
        reject(err);
      });
    });

  })
  .catch(err => {
    return err;
  });

  const result = await promise;

  return result;
}




