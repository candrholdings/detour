# Detour

A reverse proxy to untie the knot between frontend and backend developers

[<img src="https://travis-ci.org/candrholdings/detour.svg?branch=master" />](https://travis-ci.org/candrholdings/detour) [![Join the chat at https://gitter.im/candrholdings/detour](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/candrholdings/detour?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Problems
Frontend developers cannot focus on their development because

* Backend deployment is complicated and take up lot of resources on their box
* New features depends on backend API readiness
  * Mocking is okay but changing spec makes mock update time consuming
* Need to tackle CORS issue during tight development schedule

## Scenarios
* Decouple frontend and backend development team
  * Join web server and API servers together as if they are from a single server
  * Few frontend developers can use a shared backend server, no need to install database in their own box to run the whole site
  * Don't wait until backend API is ready, mock a response JSON/XML and continue web development
  * Built-in LiveReload server for quick consumption
* Mock changes on big production site
  * Mock as you need, host a smaller staging site without downloading everything from production
  * Support server side includes
* Simple URL rewrite

## Install
Run `npm install detour-proxy -g` to install detour in your box. For every site,

* Create a [`detour-config.json`](detour-config.json) (sample configuration below)
* Run `detour` to start the server
  * For custom config path and port, run `detour path-to-config-file.json 1337`

## Sample configuration
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

`logLevel` could be `error`, `warning`, `info`, `skip`, `forward`, `follow`. Detour use [`winston`](https://github.com/winstonjs/winston/).

`mappings` defines how request could be remapped. Mappings can be overlapping and they are processed from top to bottom (first win will stop other rules).

In the sample configuration, the first mapping will rewrite `/` (i.e. all requests to the site) to local directory `html/`. For example, request to `/helloworld.html` will be served with local file `html/helloworld.html`, relative to the config file.

`skipOn404` indicate that if the requested file is not found, it will skip this mapping and evaluate the next one. Otherwise, detour will return with 404.

You can specify both file path or http:// path to the `to` argument.

The second mapping will rewrite `/api/` to http://api.example.com/. For example, requests to `/api/helloworld` will be forwarded on behalf to http://api.example.com/helloworld/. Most request headers will be retained. Some are discarded, e.g. `accept-encoding`.

Currently, we do not add headers (e.g. `x-forwarded-for`, `x-forwarded-proto`) to the forwarded request.

### Default port
By default, detour use a random port number 7000-7999. To use a custom port number, you can specify it in the command-line. Type `detour path-to-config-file.json 1337` to run detour on port 1337 with configuration file `path-to-config-file.json`.

### Default document
For file-based destination, detour adopted `index.html` as the name of "default document". If the request does not contain a filename (end with slash) and the mapping destination is local file system, detour will add `index.html` to the request URL.

### Server side includes
Detour follow server side includes (or SSI). The SSI path will also be evaluated against the mappings defined in `detour-config.json`. To aid development, the SSI-ed output will have extra comment `<!-- BEGIN SSI /include/topnav.html -->` for easier debugging SSI issues.

### LiveReload support
Detour built-in [LiveReload server](http://livereload.com/). When detour is up, it will watch all file-based mapping destinations and changes will be broadcasted to LiveReload plugin immediately. Instead of using [`fs.watch`](https://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener), we use a more reliable approach by crawling file stats every 2 seconds. We still use [`fs.watch`](https://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener) but only for auxillary purpose.

### Issues
If you encounter any issues, please file it on [GitHub](../../issues). To speed up our investigation, please file with a minimal repro steps.

### Feature requests
If you want to recommend a feature, please file it on [issues](../../issues) or chat with us on [Gitter](https://gitter.im/candrholdings/detour). Please let us know rationale behind your request and we will be more than happy to design and implement the feature for you.
