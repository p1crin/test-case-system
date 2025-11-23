-- Create default admin user
-- Password: admin123
-- This script is safe to run multiple times (uses INSERT ... ON CONFLICT)

INSERT INTO mt_users (email, user_role, department, company, password)
VALUES (
  'admin@example.com',
  0, -- Admin role
  'IT',
  'Test Company',
  '$2a$10$8K1p/a0dL3LxZIzCLYF/HO7y1J8f3wQj3Y2WpQ5KQ5YqH6zP3YFPW' -- bcrypt hash of 'admin123'
)
ON CONFLICT (email) DO NOTHING;

-- Verify the user was created
SELECT id, email, user_role, department, company, created_at
FROM mt_users
WHERE email = 'admin@example.com';
