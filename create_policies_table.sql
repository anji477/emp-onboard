-- Create policies table if it doesn't exist
CREATE TABLE IF NOT EXISTS policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  summary TEXT,
  content LONGTEXT,
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size BIGINT,
  version VARCHAR(20) DEFAULT '1.0',
  effective_date DATE,
  sort_order INT DEFAULT 0,
  is_common BOOLEAN DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_sort_order (sort_order),
  INDEX idx_created_at (created_at)
);

-- Insert sample policies if table is empty
INSERT IGNORE INTO policies (title, category, summary, content, version, sort_order, created_by) VALUES
('Employee Code of Conduct', 'HR', 'Guidelines for professional behavior and ethics in the workplace', 'This document outlines the expected standards of conduct for all employees...', '1.0', 1, 1),
('IT Security Policy', 'IT', 'Information technology security guidelines and procedures', 'All employees must follow these IT security protocols to protect company data...', '1.0', 2, 1),
('Remote Work Policy', 'HR', 'Guidelines for working from home and remote locations', 'This policy establishes the framework for remote work arrangements...', '1.0', 3, 1),
('Data Privacy Policy', 'Legal', 'Company policy on handling personal and sensitive data', 'This policy outlines how we collect, use, and protect personal information...', '1.0', 4, 1);