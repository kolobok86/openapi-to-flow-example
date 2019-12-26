# openapi-to-flow-example

### Generating Flow types definitions from Swagger / OpenAPI specifications

This is example of how one can set up automatic generating of Flow types definitions from Swagger / OpenAPI specifications in his / her javascript projects, using https://github.com/yayoc/swagger-to-flowtype tool.

## Basic preparations

In this example, specifications are meant to be fetched by HTTP, and it is up to user to provide such ability. Such tools as on-premise HTTP server (Apache, Nginx, etc.), Amazon S3 storage, GitHub Pages either SwaggerHub — all can fit that purpose. The idea is to treat these downloadable specs as single source of truth across several related projects (say, frontend and backend, or several boundled microservices).


## Generating of Flow types definitions

Each of the APIs used on the project is:
- downloaded by its URL;
- saved to disk;
- and then Flow types are generated of saved specification file, using _swagger-to-flowtype_ package.


These actions are performed in _/typeUtils/generate-flow-types.js_ . It is invoked in _npm_ scripts listed in _package.json_ . Types generation is boundled to `prepublish` npm script, so types are updated on every run of `npm install` command. To update types without additional actions, run `npm run update-flow-types`.

_package.json_:
```json
  "scripts": {
    "prepublish": "npm run update-flow-types",
    . . . . .
    "update-flow-types": "node typeUtils/generate-flow-types.js",
    . . . . .
  }
```

API specifications need to be listed in _/typeUtils/specsConfig.json_ , in `apiSpecs` field, like that:

_/typeUtils/specsConfig.json_:
```json
  "apiSpecs": [
    {
      "url": "https://petstore.swagger.io/v2/swagger.yaml",
      "version": "",
      "fileName": "PetStore"
    }
  ]
```

This file reflects current API versions used in actual development branch, and should be added to VCS (Version Control System) of your choise.


`version` is optional parameter that is added to url. That is useful when API is stored in SwaggerHub, where API’s can be fetched by url of a type: `https://api.swaggerhub.com/apis/{username}/{specApiName}/{apiSpecVersion}`. Same way, whether you set up hosting API specifications yourself, it is recommended that you distinguish them by versions too, so that different branches could rely on different API versions. If new version of API is published in common HTTP source, version number should be updated here in the list.


`fileName` is name with that API specification will be saved on your local disk in _./apiSpecs_ directory. File extension (_.json_ or _.yaml_) will be added based on Content-Type header of http response. So, it will be _.yaml_ for `Content-Type=application/yaml`, and _.json_ for `Content-Type=application/json`. If _Content-Type_ response header is different from mentioned here, or is missed, _.json_ is picked as default extension, and warning message displayed in console:

`Warning: Content-Type of response is not "application/yaml" neither "application/json". Assuming that spec is in JSON format`

Also, Flow types definition, generated of the specification, will get this file name too, and saved in _./types_ directory with ".js" extension.


Downloaded specifications are saved in _/apiSpecs_ directory. The recommendation is to add these specifications to VCS. This way, you can easily trace changes introduced in different API versions, without re-fetching them every time.


The generated Flow types are saved in _/types_ directory, and should be added to VCS too. That enables one to switch between VCS branches easily, without updating them after every switching between branches.


## Accessing API specifications that require authentication

If API specifications are published in Internet (and even in company internal network, sometimes), unauthorized access to them should be prevented (unless you work on Open Source project). Common way to do that is to grant access by secret key passed in _Authorization_ request header (say, this is actual for Basic Authentication or OAuth 2.0). Details of setting this up depend on tool that is used to publish API specifications. GitHub Pages provides authorization by secret key for private repositories, so as SwaggerHub for private API's. If you host API specifications via some HTTP server, simplest way is Basic Authentication (near any of HTTP servers support it). Particular details of setting this up are out of scope of this example, please refer to your tool's documentation.


This example supports specifying the authorization secret key (bearer token, secret key, base64-encoded login : password for Basic Authentication, etc.) in _Authorization_ request header. The key should be specified in _/typeUtils/apiSecretKeys.json_ . The file **should not (!)** be added to VCS (please see project's _.gitignore_ file), as it stores security keys (no matter if they are common for all team, or are unique for each developer). The general file structure can be seen in _/typeUtils/apiSecretKeys.json.example_ file, and each developer is supposed to create _/typeUtils/apiSecretKeys.json_ file of it and add keys required. The `apiSecretKeys` section stores key for each API. The keys are matched with API’s listed in _/typeUtils/specsConfig.json_ by API’s `url`, without version. So, different versions of same API will use same secret key.

For instance, to pass secret key to _https://petstore.swagger.io/v2/swagger.yaml_ API listed in _/typeUtils/specsConfig.json_:

_/typeUtils/specsConfig.json_:
```json
  "apiSpecs": [
    {
      "url": "https://petstore.swagger.io/v2/swagger.yaml",
      "version": "",
      "fileName": "PetStore"
    }
  ]
```

we create related record in _/typeUtils/apiSecretKeys.json_ :

_/typeUtils/apiSecretKeys.json_:
```json
{
  "apiSecretKeys": {
    "https://petstore.swagger.io/v2/swagger.yaml": "12345-678910-11a12b13c14d15e"
  }
}
```
_In real life, API specifications https://petstore.swagger.io/v2/swagger.yaml and https://petstore.swagger.io/v2/swagger.json are publicly available without any authentication, here this url is picked just as example._


## Example of using the generated types

And finally, _/src/index.js_ is simple example of using generated Flow types in project code. To run it, start in console:

```bash
npm run build; npm run start;
```

As _/src/index.js_ contains Flow types, the code should be compiled into javascript code before it can be executed. For sake of simplicity, here this is done using _flow-remove-types_ package. In real projects, _babel_ may be better choise, as it has many useful features (please refer to Flow documentation here https://flow.org/en/docs/install/ ).


Creds:
swagger-to-flowtype: https://github.com/yayoc/swagger-to-flowtype
Swagger / OpenAPI: https://swagger.io/specification/
