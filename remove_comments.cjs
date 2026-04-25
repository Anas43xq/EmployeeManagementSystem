const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        walk(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk(path.join(__dirname, 'src'));
let modifiedFiles = 0;

const regex = /(['"`])(?:(?!\1)[^\\]|\\.)*\1|(\/\/.*)|(\/\*[\s\S]*?\*\/)/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  const newContent = content.replace(regex, (match, quote, singleLine, multiLine) => {
    if (quote) return match; // it's a string
    
    if (singleLine) {
      if (singleLine.includes('eslint-disable')) {
        return match; // keep eslint-disable
      }
      if (singleLine.includes('/// <reference')) {
        return match; // keep TS references
      }
      changed = true;
      return ''; // remove comment
    }
    
    if (multiLine) {
      if (multiLine.includes('eslint-disable') || multiLine.includes('@param')) {
        return match; // keep eslint or param comments
      }
      changed = true;
      return ''; // remove block comment
    }
    
    return match;
  });

  if (changed) {
    // Clean up empty lines that consist only of whitespace (like where comments used to be)
    // but don't aggressively remove all newlines.
    const cleanedContent = newContent.replace(/^\s*\n/gm, '');
    fs.writeFileSync(file, cleanedContent, 'utf8');
    modifiedFiles++;
  }
}

console.log('Modified ' + modifiedFiles + ' files.');
