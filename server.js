// import app from "./app.js";
// import sequelize from "./config/db.js";

// async function startServer() {
//   try {
//     const PORT = process.env.PORT || 5000;

//     await sequelize.authenticate();
//     console.log("✅ Database connected...");
//     app.listen(PORT, () => {
//       console.log(`🚀 Server running on port ${PORT}`);
//     });
//   } catch (error) {
//     console.log(error)
//     process.exit()
//   }
// }

// startServer();


// import app from "./app.js";
// import sequelize from "./config/db.js";

// // Initialize the database connection once
// await sequelize.authenticate();
// console.log("✅ Database connected...");

// // Vercel expects a function that handles requests directly
// export default function handler(req, res) {
//   return app(req, res);
// }

import app from "./app.js";
import sequelize from "./config/db.js";

async function init() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected...");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}

await init();

function startLocalServer() {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on http://localhost:${PORT}`);
  });
}

// ✅ Export handler for Vercel (always defined)
export default function handler(req, res) {
  return app(req, res);
}

// ✅ Only start listener if NOT running on Vercel
if (!process.env.VERCEL) {
  startLocalServer();
}


