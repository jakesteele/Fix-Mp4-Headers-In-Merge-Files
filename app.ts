#!/usr/bin/env node
import * as fs from "fs/promises";
import * as fss from "fs";
import * as path from "path";
import * as child_process from "child_process";

// Get the current working directory
const currentDirectory = process.cwd();
let fypBuffer: Buffer | null = null;
let moovBuffer: Buffer | null = null;
let dataBuffers: Array<Buffer> = [];

// async function processFile(fileName: string) {
//   if (path.extname(fileName) === ".merged") {
//     const filePathInput = path.join(currentDirectory, fileName);
//     console.log(path.basename(filePathInput));
//     try {
//       const fd = await fs.open(filePathInput, "r");
//       console.log(`\nProcessing file: ${fileName}`);
//       const { size } = fs.statSync(filePathInput);
//       let currentPos = 0;

//       while (currentPos < size) {
//         const chunkSize = Buffer.alloc(4);
//         const chunkType = Buffer.alloc(4);

//         // Read the Size
//         currentPos += fs.readSync(
//           fd,
//           chunkSize,
//           0,
//           chunkSize.length,
//           currentPos
//         );
//         const cSize = chunkSize.readUInt32BE(0);
//         // Read the Type
//         currentPos += fs.readSync(
//           fd,
//           chunkType,
//           0,
//           chunkType.length,
//           currentPos
//         );
//         const type = chunkType.toString("utf-8", 0, 4);
//         console.log(`${type}: ${cSize} bytes`);
//         const data = Buffer.alloc(cSize);
//         currentPos -= 8;
//         currentPos += fs.readSync(fd, data, 0, data.length, currentPos);
//         if (type == "fyp") {
//           fypBuffer = data;
//         }
//         if (type == "moov") {
//           moovBuffer = data;
//           let dataBuffer: Buffer = Buffer.alloc(size - currentPos);
//           currentPos += fs.readSync(
//             fd,
//             dataBuffer,
//             0,
//             dataBuffer.length,
//             currentPos
//           );
//           dataBuffers.push(data);
//           break;
//         } else {
//           dataBuffers.push(data);
//         }
//       }
//       await fd.close();
//     } catch (e) {
//       console.log(e);
//     }
//   }
// }
async function processFile(fileName: string) {
  if (path.extname(fileName) === ".merged") {
    const filePathInput = path.join(currentDirectory, fileName);
    console.log(path.basename(filePathInput));

    try {
      const fd = await fs.open(filePathInput, "r");
      console.log(`\nProcessing file: ${fileName}`);
      const stats = await fs.stat(filePathInput);
      let currentPos = 0;

      while (currentPos < stats.size) {
        const chunkSize = Buffer.alloc(4);
        const chunkType = Buffer.alloc(4);

        // Read the Size
        currentPos += (
          await fd.read(chunkSize, 0, chunkSize.length, currentPos)
        ).bytesRead;
        const cSize = chunkSize.readUInt32BE(0);

        // Read the Type
        currentPos += (
          await fd.read(chunkType, 0, chunkType.length, currentPos)
        ).bytesRead;
        const type = chunkType.toString("utf-8", 0, 4);
        console.log(`${type}: ${cSize} bytes`);

        const data = Buffer.alloc(cSize);
        currentPos -= 8; // Readjust position due to header read
        currentPos += (await fd.read(data, 0, data.length, currentPos))
          .bytesRead;

        if (type == "fyp") {
          // Assuming fypBuffer is declared elsewhere
          fypBuffer = data;
        } else if (type == "moov") {
          moovBuffer = data; // Assuming moovBuffer is declared elsewhere
          let dataBuffer: Buffer = Buffer.alloc(stats.size - currentPos);
          currentPos += (
            await fd.read(dataBuffer, 0, dataBuffer.length, currentPos)
          ).bytesRead;
          dataBuffers.push(dataBuffer);
          break;
        } else {
          dataBuffers.push(data);
        }
      }

      await fd.close();
    } catch (err) {
      console.error(err);
    }
  }
}

// Function to process each file with the .merged extension
async function processFiles() {
  try {
    const files = await fs.readdir(currentDirectory);
    for (const fileName of files) {
      await processFile(fileName);
    }
    const filePathOutput = path.join(currentDirectory, "merged.mp4");
    // Check if the file exists and delete it if it does
    try {
      await fs.access(filePathOutput);
      await fs.unlink(filePathOutput);
    } catch (err) {
      console.log("No existing file to remove");
    }
    // Creating and writing to the file
    const streamOutput = fss.createWriteStream(filePathOutput);
    if (fypBuffer) {
      streamOutput.write(fypBuffer);
    }
    if (moovBuffer) {
      streamOutput.write(moovBuffer);
    }
    for (let buffer of dataBuffers) {
      streamOutput.write(buffer);
    }
    streamOutput.end(); // Use end instead of close to ensure 'finish' event is emitted
    streamOutput.on("finish", () => {
      console.log("Finished. \n");
    });
    streamOutput.on("error", (error) => {
      console.error("Error writing file:", error);
    });
  } catch (err) {
    console.error("Error reading directory or processing files:", err);
  }
}
// async function processFiles() {
//   fs.readdir(currentDirectory, async (err, files) => {
//     if (err) {
//       console.error("Error reading directory:", err);
//       return;
//     }

//     for (const fileName of files) {
//       await processFile(fileName);
//     }
//     const filePathOutput = path.join(currentDirectory, "merged.mp4");
//     if (fs.existsSync(filePathOutput)) fs.unlinkSync(filePathOutput);
//     const streamOutput = fs.createWriteStream(filePathOutput);
//     if (fypBuffer) {
//       streamOutput.write(fypBuffer);
//     }
//     if (moovBuffer) {
//       streamOutput.write(moovBuffer);
//     }
//     for (var i = 0, l = dataBuffers.length; i < l; i++) {
//       streamOutput.write(dataBuffers[i]);
//     }
//     // if (dataBuffer) {
//     //   streamOutput.write(dataBuffer);
//     // }
//     streamOutput.close();
//     console.log("Finished. \n");
//   });
// }

// Entry point of the CLI application
function main() {
  processFiles();
}

// Call the main function to start the CLI application
main();
