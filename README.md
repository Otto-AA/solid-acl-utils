# Solid ACL Utils [WIP]
[![Build Status](https://travis-ci.org/Otto-AA/solid-acl-utils.svg?branch=master)](https://travis-ci.org/Otto-AA/solid-acl-utils)

A js library for working with acl files. It allows you to add/change/remove permissions of files and folders in solid pods.

# Documentation
*Due to a lack of time this is not as detailed as I'd like to and hasn't got that many examples. This will hopefully change in the future*

Live example: https://otman.solid.community/public/solid-acl-utils/examples/

## Installation

Currently this library is still in beta and not well tested. Therefore it isn't yet published on npm.

### Via npm

Install it from github
```sh
npm install otto-aa/solid-acl-utils
```

Import it in your code

```javascript
const SolidAclUtils = require('solid-acl-utils')

// You could also use SolidAclUtils.Permissions.READ instead of following
// This is just more convenient
const { AclApi, AclDoc, AclParser, AclRule, Permissions, Agents } = SolidAclUtils
const { READ, WRITE, APPEND, CONTROL } = Permissions
```

## Usage

### Load the acl file

First of all we need to load the acl file. The library needs to do some authenticated http requests for that, so you will need to pass it a fetch method (e.g. from solid-auth-client)

```javascript
// Passing it the fetch from solid-auth-client
const fetch = solid.auth.fetch.bind(solid.auth)

// Create an AclApi instance
// If autoSave=true, the library will update the permissions with every change you make to the acl
// If autoSave=false you need to call acl.saveToPod() manually when you are ready
const aclApi = new AclApi(fetch, { autoSave: true })
const acl = await aclApi.loadFromFileUrl('https://pod.example.org/file.ttl')

// now we can make changes to acl and it will be automatically updated
```

### Update permissions

This library is only a wrapper to [solid-acl-parser](https://github.com/Otto-AA/solid-acl-parser). To get a better understanding of all the possibilities, please go to its [documentation page](https://otto-aa.github.io/solid-acl-parser/#/quickstart).

The doc returned by `loadFromFileUrl` behaves exactly as the one from solid-acl-parser, except that it has a "saveToPod" method and if autoSave is enabled all methods which modify the document will store the changes in the pod and return a Promise.

```javascript
const aclApi = new AclApi(fetch, { autoSave: true })
const acl = await aclApi.loadFromFileUrl('https://pod.example.org/file.ttl')

// Note: Workaround, because currently no default permissions are copied when a new acl file is created. Not doing this could result in having no CONTROL permissions after the first acl.addRule call
if (!acl.hasRule(Permissions.ALL, ownerWebId)) {
  await acl.addRule(Permissions.ALL, ownerWebId)
}

// The format for granting/checking/deleting permissions is
// acl.addRule([permissions], [webIds]/agents)
// For more granular control refer to the solid-acl-parser documentation

// Share the file/folder with another webId
await acl.addRule(READ, webId)

// Collaborate with another user
await acl.addRule([READ, WRITE], webId)

// Revoke permissions
await acl.deleteRule([READ, WRITE], webId)

// Give everyone read access
await acl.addRule(READ, Agents.PUBLIC)

// Check if someone else has writing access
const agents = acl.getAgentsWith(WRITE)
console.log([...agents.webIds]) // array containing all webIds which have write access
console.log([...agents.groups])
console.log(agents.hasPublic())
console.log(agents.hasAuthenticated()) // Authenticated means everyone who is logged in

// Get all permissions a specific user has
const permissions = acl.getPermissionsFor(webId)
permissions.has(READ) // true/false
permissions.has([READ, WRITE]) // true/false
```

Example using autoSave=false. Now the changes are made locally and only sent to the pod when `saveToPod()` is called. This is likely the better choice if you want to do more than one modification or want to preview changes before saving them.

```javascript
const aclApi = new AclApi(fetch, { autoSave: false })
const acl = aclApi.loadFromFileUrl('https://pod.example.org/file.ttl')

// Note: Workaround, because currently no default permissions are copied when a new acl file is created. Not doing this could result in having no CONTROL permissions after the first acl.addRule call
if (!acl.hasRule(Permissions.ALL, ownerWebId)) {
  acl.addRule(Permissions.ALL, ownerWebId)
}

acl.addRule([READ, WRITE], webId)
acl.addRule(READ, Agents.PUBLIC)

await acl.saveToPod()
```