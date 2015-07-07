# Detour
A reverse proxy for frontend developers

[<img src="https://travis-ci.org/candrholdings/detour.svg?branch=master" />](https://travis-ci.org/candrholdings/detour)

## Install
* `npm install detour-proxy -g`
* Edit [`detour-config.json`](detour-config.json)
* Run `detour`
  * For custom config file and port, run `detour config-file.json 1337`

## Sample configuration
Namely, `detour-config.json`, is the configuration file for detour. The following is a sample configuration.
```js
{
    "logLevel": "follow",
    "mappings": [{
        "from": "/",
        "to": "html/",
        "skipOn404": true
    }, {
        "from": "/api/",
        "to": "http://api.example.com/"
    }]
}
```

`loglevel` could be `error`, `warning`, `info`, `skip`, `forward`, `follow`. Detour use `winston` for logging.

`mappings` are processed from top to bottom, and they define how the request could be remapped.

In the sample configuration, the first rule will map `/` (i.e. every requests to the web site) to local directory `html/`. For example, request to `/helloworld.html` will be forwarded to file `html/helloworld.html`. The path is relative to the config file.

`skipOn404` indicate that if the requested file is not found, it will skip this mapping and evaluate the next one. Otherwise, detour will return with 404.

The second rule will map `/api/` to http://api.example.com/. For example, requests to `/api/helloworld` will be forwarded on behalf to http://api.example.com/helloworld/. Most request headers will be retained. Some are discarded, e.g. `accept-encoding`.

### Default port
Detour use a random port number 7000-7999. You can specify it in the command-line, `detour config.json 1337` to run detour on port 1337 with configuration file `config.json`.

### Default document
Detour adopted `index.html` as the name of "default document" for file-based destination. If the request does not contain a filename and the destination is on file system, detour will add `index.html` to the request.

### Server-side include (SSI)
Detour follow SSI. The SSI path will be evaluated against the mappings defined in `detour-config.json`. To aid development, the SSI-ed output will have extra comment `<!-- BEGIN SSI /include/topnav.html -->` for easier debugging SSI issues.

### LiveReload support
Detour built-in [LiveReload server](http://livereload.com/) natively. All file-based mapping destinations will be watched and changes will be broadcasted to LiveReload plugin.

### Issues
If you encounter any issues, please file it on [GitHub](issues). To speed up our investigation, please file with a minimal repro steps.
