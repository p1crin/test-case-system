const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10).then(hash => {
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL to update:');
  console.log(`UPDATE mt_users SET password = '${hash}' WHERE email = 'admin@example.com';`);
}).catch(err => {
  console.error('Error:', err);
});
