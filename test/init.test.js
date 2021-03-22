const mongoUnit = require("mongo-unit");
const testData = require("./test-data/tables");
before(async () => {
  serverFn = require("./server");

  try {
    await mongoUnit.start();
    console.log("Starting mongo-unit server at: ", mongoUnit.getUrl());
    process.env.DATABASE_URL = mongoUnit.getUrl(); // this var process.env.DATABASE_URL = will keep link to fake mongo
    serverFn(mongoUnit.getUrl());
    mongoUnit.initDb(mongoUnit.getUrl(), testData);
    mongoUnit.load(testData);
  } catch (e) {
    console.log("Error" + e);
  }
});

after(() => {
  console.log("stopping Mongo-unit server");
  return mongoUnit.stop();
});

beforeEach(() => {
  // console.log(`calling before`);
  mongoUnit.load(testData);
});
afterEach(() => {
  // console.log(`calling after`);
  mongoUnit.drop();
});
