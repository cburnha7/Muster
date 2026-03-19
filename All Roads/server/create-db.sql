-- Create the muster database if it doesn't exist
SELECT 'CREATE DATABASE muster'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'muster')\gexec
