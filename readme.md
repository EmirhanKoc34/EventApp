You should write

ALTER TABLE login.users MODIFY username VARCHAR(45) COLLATE utf8mb4_bin UNIQUE;

after creating the table because of the case sensitivity unless there will be errors in logins and privilege checks