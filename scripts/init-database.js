const { Pool } = require('pg');
const config = require('../config');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  console.log('🗄️ Initializing database...');
  
  // First, connect to the default postgres database to create our database
  const adminPool = new Pool({
    connectionString: config.database.url.replace('/walletDb', '/postgres'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check if database exists
    const dbCheck = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'walletDb'"
    );
    
    if (dbCheck.rows.length === 0) {
      console.log('📝 Creating database walletDb...');
      await adminPool.query('CREATE DATABASE walletDb');
      console.log('✅ Database walletDb created successfully');
    } else {
      console.log('✅ Database walletDb already exists');
    }
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
  } finally {
    await adminPool.end();
  }

  // Now connect to our specific database and create tables
  const pool = new Pool({
    connectionString: config.database.url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📋 Creating tables...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('✅ Database schema created successfully');
    
    // Test the connection
    const testQuery = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection test successful:', testQuery.rows[0].current_time);
    
  } catch (error) {
    console.error('❌ Error initializing database schema:', error.message);
  } finally {
    await pool.end();
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
