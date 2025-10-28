#!/bin/bash
set -e

# Stop script if not on Linux
if [ "$(uname)" != "Linux" ]; then
  echo "Not on Linux. Skipping MongoDB tools installation."
  exit 0
fi

echo "Installing MongoDB Tools (for Linux)..."

# --- DEFINE FILE AND FOLDER NAMES ---
# We use a known-good version for Ubuntu 22.04 (Render's environment)
DOWNLOAD_URL="https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.12.1.tgz"
TAR_FILE="mongo-tools.tgz"
EXTRACT_FOLDER="mongodb-database-tools-ubuntu2204-x86_64-100.12.1"
BIN_DIR="./bin"

# --- SCRIPT START ---
echo "Creating bin directory..."
mkdir -p $BIN_DIR

echo "Downloading MongoDB tools from $DOWNLOAD_URL..."
# Use curl with -L to follow redirects and -f to fail on server errors
curl -f -L "$DOWNLOAD_URL" -o $TAR_FILE

echo "Extracting $TAR_FILE..."
# Extract the tarball
tar -xvzf $TAR_FILE

echo "Moving binaries to $BIN_DIR..."
# Move only the binaries we need to our bin folder
mv $EXTRACT_FOLDER/bin/mongodump $BIN_DIR/
mv $EXTRACT_FOLDER/bin/mongorestore $BIN_DIR/

echo "Making binaries executable..."
# Make the binaries executable
chmod +x $BIN_DIR/mongodump
chmod +x $BIN_DIR/mongorestore

echo "Cleaning up downloaded files..."
# Clean up the downloaded file and extracted folder
rm -rf $TAR_FILE $EXTRACT_FOLDER

echo "MongoDB Tools (mongodump, mongorestore) installed in $BIN_DIR"