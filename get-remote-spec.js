const keys = require('./secret-keys.json');
const http = require('http');
const https = require('https');
const fs = require('fs');

const specUrl = process.env.npm_package_apiSpecUrl;
const specVersion = process.env.npm_package_apiSpecVersion;
const specFullUrl = `${specUrl}/${ specVersion || ''}`;

const specFilePath = './apiSpecs/petStore.yaml';

const webClient = (specUrl.startsWith('https://')) ? https : http;
let fetchError = false;

const specFileWriteStream = fs.createWriteStream(specFilePath);

specFileWriteStream.on('error', (err) => {
  fetchError = true;
  console.log('Error on writing spec to local file:');
  console.log(err);
  specFileWriteStream.close();

  process.exit();
});

specFileWriteStream.on('finish', () => {
  if (fetchError) {
    console.log(`Spec fetch failed!`);
  } else {
    console.log(`Spec fetch succeded, spec saved in ${specFilePath}`);
  }

  process.exit(0);
});

webClient.get(specFullUrl, (res) => {
  if (res.statusCode === 200) {
    res.pipe(specFileWriteStream);
  } else {
    console.log(`Error on fetching spec: HTTP error code ${res.statusCode}`);
    res.pipe(process.stdout);
    res.on('end', () =>{
      process.exit();
    });
  }

  res.on('error', (err) => {
    console.log(`Error on fetching spec from remote host:`);
    console.log(err);
    specFileWriteStream.close();
    process.exit();
  });
});

