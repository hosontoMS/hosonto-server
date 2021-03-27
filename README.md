# Welcome to Hosonto server 🎉 🧡 🧚

[![Build Status](https://travis-ci.com/hosontoMS/hosonto-server.svg?branch=master)](https://travis-ci.com/hosontoMS/hosonto-server)

> Hosonto server and API part

### 🏠 [Homepage](http://hosonto.com)

## Install

```sh
npm install hosonto-server
```

## Usage

```
const {HosontoServer}  = require("hosonto-server")

app = express()

let server = new HosontoServer(app, myConnectorInstance, configuration)

```

####

- myConnectorInstance is the database connector instance you pass for data access requirements
  [the mongoose connector instance creation can be copied from](lib/db/MyConnector.js)
- configuration is the relevant configuration options using nconf
  [a sample can be copied from](test/config/index.js)

### Exported Modules

- HosontoServer: The main class to create the server, adding hosonto Event execution and Automation api's
- MongoDBConnector: The main mongoDB adapter
- MongoAccessHelper: The security and access controller for mongoDB

## Author ⭐

👤 **Hosonto MS**

- Twitter: [@hosontoMS](https://twitter.com/hosontoMS)
- Github: [@hosontoMS](https://github.com/hosontoMS)

## Show your support

Give a ⭐️ if this project helped you!
