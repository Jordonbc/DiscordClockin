const fs = require("fs");
const path = require("path");

// Define the output file
const OUTPUT_FILE = "directory_structure.json";
const IGNORE_DIR = "node_modules";

/**
 * Recursively scan a directory and build its file structure.
 * @param {string} dirPath - Directory path to scan.
 * @returns {object} Folder and file structure.
 */
function scanDirectory(dirPath) {
  const result = {};

  // Read directory content
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Skip node_modules directory
    if (entry.name === IGNORE_DIR) continue;

    if (entry.isDirectory()) {
      // Recurse into the subdirectory
      result[entry.name] = scanDirectory(fullPath);
    } else {
      result[entry.name] = "file";
    }
  }
  return result;
}

// Root directory (where the script is run)
const rootDir = process.cwd();

console.log(`Scanning directory: ${rootDir}`);

// Generate directory structure
const directoryStructure = scanDirectory(rootDir);

// Write the result to a file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(directoryStructure, null, 2));

console.log(`Directory structure written to ${OUTPUT_FILE}`);
