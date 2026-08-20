require('dotenv').config();
const mysql = require('mysql');

// Register the Cart migration entry if missing
const CART_MIGRATION = '20260820042032-create-cart.js';

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'ecommercedb'
});

db.connect(function(err) {
  if (err) { console.error('Connect error:', err.message); process.exit(1); }

  db.query(
    "INSERT IGNORE INTO SequelizeMeta (name) VALUES (?)",
    [CART_MIGRATION],
    function(err2) {
      if (err2) { console.error('Error:', err2.message); db.end(); process.exit(1); }
      console.log('Cart migration entry ensured in SequelizeMeta.');

      db.query("SELECT name FROM SequelizeMeta", function(err3, rows) {
        if (err3) console.error(err3.message);
        else console.log('All registered migrations:', rows.map(r => r.name));
        db.end();
        process.exit(0);
      });
    }
  );
});
