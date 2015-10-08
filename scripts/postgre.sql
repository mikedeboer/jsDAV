CREATE TABLE users (
  username VARCHAR(50) PRIMARY KEY,
  password TEXT -- hash please!
);

CREATE TABLE principals (
  uri VARCHAR(150) PRIMARY KEY,
  displayname VARCHAR(50),
  email VARCHAR(70),
  vcardurl TEXT
);

CREATE TABLE groupmembers (
  group VARCHAR(150) REFERENCES principals(uri),
  member VARCHAR(150) REFERENCES principals(uri)
);

CREATE TABLE addressbooks (
  id SERIAL PRIMARY KEY,
  uri VARCHAR(150),
  principaluri VARCHAR(150) REFERENCES principals(uri),
  description TEXT,
  displayname VARCHAR(50),
  ctag INT
);

CREATE TABLE cards (
  uri VARCHAR(150),
  lastmodified TIMESTAMP,
  addressbookid INT REFERENCES addressbooks(id),
  carddata TEXT
);