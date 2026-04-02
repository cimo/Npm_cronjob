# Npm_cronjob
Npm package, cronjob schedule. Light, fast and secure.
Writed with native Typescript code and no dependencies are used.

## Pack
1. npm run build
2. Copy the file "/build/package_name-x.x.x.tgz" in the project root folder.
3. In the "package.json" file insert: "@cimo/package_name": "file:package_name-x.x.x.tgz"

## Publish
1. npm run build
2. npm login --auth-type=legacy
3. npm publish --auth-type=legacy --access public

## Installation
1. Link for npm package -> https://www.npmjs.com/package/@cimo/cronjob

## Server
- Server.ts
```
...

import { Cc } from "@cimo/cronjob/dist/src/Main";

...

Cc.execute("./file/cronjob/");

...
```

## Example
1. Create a folder "/file/cronjob/" in your root folder and add the file:
    - xxx.json
    ```
    {
        "schedule": "*/1 * * * *",
        "command": "ls -la"
    }
    ```
2. Each file can execute only 1 instruction (it's possible execute all linux command).
