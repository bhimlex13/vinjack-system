#!/bin/bash
set -e

# Stop script if not on Linux
if [ "$(uname)" != "Linux" ]; then
  echo "Not on Linux. Skipping MongoDB tools installation."
  exit 0
fi

echo "Installing MongoDB Tools (for Linux)..."

# Create a bin directory in the server folder
mkdir -p ./bin

# Download the official MongoDB Database Tools (a recent stable version)
curl "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-linux-x86_64-100.9.4.tgz" -o mongo-tools.tgz

# Extract the archive
tar -xvzf mongo-tools.tgz

# Move only the binaries we need to our bin folder
mv mongodb-database-tools-linux-x86_64-100.9.4/bin/mongodump ./bin/
mv mongodb-database-tools-linux-x86_64-100.9.4/bin/mongorestore ./bin/

# Make the binaries executable
chmod +x ./bin/mongodump
chmod +x ./bin/mongorestore

# Clean up the downloaded file and extracted folder
rm -rf mongo-tools.tgz mongodb-database-tools-linux-x86_64-100.9.4

echo "MongoDB Tools (mongodump, mongorestore) installed in ./bin"