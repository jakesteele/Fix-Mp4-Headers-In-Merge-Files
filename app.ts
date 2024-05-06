#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";

// Get the current working directory
const currentDirectory = process.cwd();

// Function to process each file with the .merged extension
function processFiles() {
  const inputFilesForMerge: Array<String> = [];
  fs.readdir(currentDirectory, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }

    files.forEach((fileName) => {
      if (path.extname(fileName) === ".merged") {
        const fileNameNoExt = fileName.replace(".merged", ".mp4");
        // const filePathMerged = path.join(currentDirectory, `merged.mp4`);
        const filePathOutput = path.join(currentDirectory, fileNameNoExt);

        if (fs.existsSync(filePathOutput)) fs.unlinkSync(filePathOutput);

        const streamOutput = fs.createWriteStream(filePathOutput);

        const filePathInput = path.join(currentDirectory, fileName);
        console.log(path.basename(filePathInput));
        fs.open(filePathInput, "r", function (err, fd) {
          if (err) {
            return console.error(err);
          }
          console.log(`\nProcessing file: ${fileName}`);
          const { size } = fs.statSync(filePathInput);
          let currentPos = 0;
          let fypBuffer: Buffer | null = null;
          let moovBuffer: Buffer | null = null;
          let dataBuffer: Buffer | null = null;

          while (currentPos < size) {
            const chunkSize = Buffer.alloc(4);
            const chunkType = Buffer.alloc(4);

            // Read the Size
            currentPos += fs.readSync(
              fd,
              chunkSize,
              0,
              chunkSize.length,
              currentPos
            );
            const cSize = chunkSize.readUInt32BE(0);
            // Read the Type
            currentPos += fs.readSync(
              fd,
              chunkType,
              0,
              chunkType.length,
              currentPos
            );
            const type = chunkType.toString("utf-8", 0, 4);
            console.log(`${type}: ${cSize} bytes`);
            const data = Buffer.alloc(cSize);
            currentPos -= 8;
            currentPos += fs.readSync(fd, data, 0, data.length, currentPos);
            if (type == "fyp") {
              fypBuffer = data;
            }
            if (type == "moov") {
              moovBuffer = data;
              dataBuffer = Buffer.alloc(size - currentPos);
              currentPos += fs.readSync(
                fd,
                dataBuffer,
                0,
                dataBuffer.length,
                currentPos
              );
              fs.close(fd);
              break;
            }
          }
          if (fypBuffer) {
            streamOutput.write(fypBuffer);
          }
          if (moovBuffer) {
            streamOutput.write(moovBuffer);
          }
          if (dataBuffer) {
            streamOutput.write(dataBuffer);
          }
          streamOutput.close();
          console.log("Finished. \n");
        });
        inputFilesForMerge.push(fileNameNoExt);
      }
    });
  });
}

// Entry point of the CLI application
function main() {
  processFiles();
}

// Call the main function to start the CLI application
main();
