import { runPipeline } from "../src/reelPipeline.js";

runPipeline()
  .then((summary) => {
    console.log("\n--- Pipeline run complete ---");
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((err) => {
    console.error("Pipeline run failed:", err);
    process.exit(1);
  });
