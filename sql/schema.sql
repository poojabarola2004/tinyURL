-- Create database (run as a user with create DB privileges)
CREATE DATABASE IF NOT EXISTS tinylink;
USE tinylink;

DROP TABLE IF EXISTS links;

CREATE TABLE links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  clicks INT NOT NULL DEFAULT 0,
  last_clicked DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Optional example row:
-- INSERT INTO links (code, target_url) VALUES ('abc1234','https://example.com');
