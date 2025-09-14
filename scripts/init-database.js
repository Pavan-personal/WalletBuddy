const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function initializeDatabase() {
  console.log('🗄️ Initializing database with Prisma...');
  
  try {
    // Generate Prisma client
    console.log('📝 Generating Prisma client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated successfully');
    
    // Push schema to database
    console.log('📋 Pushing schema to database...');
    await execAsync('npx prisma db push');
    console.log('✅ Database schema pushed successfully');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
