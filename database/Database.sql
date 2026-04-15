
CREATE DATABASE study_group_finder;

USE study_group_finder;

CREATE TABLE users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100)  NOT NULL,
  email           VARCHAR(150)  UNIQUE NOT NULL,
  password        VARCHAR(255)  NOT NULL,        
  program         VARCHAR(150),                  
  year_of_study   INT,                          
  role            ENUM('student', 'admin') DEFAULT 'student',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE study_groups (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(150)  NOT NULL,
  course_name      VARCHAR(150),
  course_code      VARCHAR(50),
  description      TEXT,
  meeting_location VARCHAR(255),                 
  leader_id        INT NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE group_members (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  group_id   INT NOT NULL,
  user_id    INT NOT NULL,
  joined_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_membership (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)        ON DELETE CASCADE
);
CREATE TABLE study_sessions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  group_id     INT NOT NULL,
  title        VARCHAR(200),
  date         DATE    NOT NULL,
  time         TIME    NOT NULL,
  location     VARCHAR(255),    
  description  TEXT,
  created_by   INT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id)   REFERENCES study_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)        ON DELETE CASCADE
);

CREATE TABLE posts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  group_id   INT  NOT NULL,
  user_id    INT  NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)        ON DELETE CASCADE
);
