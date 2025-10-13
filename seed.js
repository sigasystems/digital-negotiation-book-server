import sequelize from './config/db.js';
import User from './models/user.model.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    // Your migration or seeding logic
    await User.create({ name: 'John Doe', email: 'john@example.com' });

  } catch (err) {
    console.error(err);
  } finally {
    // Close the connection to free DB slots
    await sequelize.close();
    console.log('DB connection closed');
  }
}

main();
