// Initialize CloudBase database collections
const cloudbase = require("@cloudbase/node-sdk");
const app = cloudbase.init({ env: process.env.CLOUDBASE_ENV_ID });
const db = app.database();

async function init() {
  const collections = ["models", "garments", "results", "trash"];
  for (const name of collections) {
    try {
      await db.createCollection(name);
      console.log("created:", name);
    } catch (e) {
      if (e.message?.includes("already exist") || e.message?.includes("Duplicate")) {
        console.log("exists:", name);
      } else {
        console.log(name + ":", e.message);
      }
    }
  }
  console.log("done");
}
init();
