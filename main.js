import { openDB } from "./db.js";
import { seedRelationTypes } from "./seed.js";

async function initApp() {
  await openDB();
  await seedRelationTypes();

  console.log("App pronto");
}

initApp();