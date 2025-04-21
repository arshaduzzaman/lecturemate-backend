// pptParser.js
const JSZip = require("jszip");
const { DOMParser } = require("xmldom");
const fs = require("fs");
const textract = require("textract");
const { promisify } = require("util");

// Promisify textract.fromBufferWithMime
const extractTextFromBuffer = promisify(textract.fromBufferWithMime);

/**
 * Extract text from a PowerPoint file (PPTX format)
 * @param {Buffer} buffer - The PowerPoint file as a buffer
 * @returns {Promise<string>} - The extracted text
 */
async function extractTextFromPPTX(buffer) {
  try {
    const zip = new JSZip();
    const content = await zip.loadAsync(buffer);

    // Define XML namespace for accessing text nodes in PowerPoint slides
    const aNamespace = "http://schemas.openxmlformats.org/drawingml/2006/main";
    let extractedText = "";

    // Process each slide
    let slideIndex = 1;
    while (true) {
      const slideFile = content.file(`ppt/slides/slide${slideIndex}.xml`);

      if (!slideFile) break;

      const slideXmlStr = await slideFile.async("text");

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(slideXmlStr, "application/xml");

      // Extract text from text nodes
      const textNodes = xmlDoc.getElementsByTagNameNS(aNamespace, "t");
      for (let i = 0; i < textNodes.length; i++) {
        extractedText += textNodes[i].textContent + " ";
      }

      // Add a separator between slides
      extractedText += "\n\n";

      slideIndex++;
    }

    return extractedText.trim();
  } catch (err) {
    console.error("Error extracting text from PPTX:", err);
    throw new Error("Failed to extract text from PowerPoint file");
  }
}

/**
 * Extract text from a PowerPoint file (PPT or PPTX)
 * @param {Buffer} buffer - The PowerPoint file as a buffer
 * @param {string} fileExtension - The file extension ('ppt' or 'pptx')
 * @returns {Promise<string>} - The extracted text
 */
async function extractTextFromPowerPoint(buffer, fileExtension) {
  try {
    if (fileExtension === "pptx") {
      try {
        // Try the custom PPTX parser first
        return await extractTextFromPPTX(buffer);
      } catch (error) {
        console.log("Failed with custom PPTX parser, falling back to textract");
        // Fall back to textract if the custom parser fails
        return await extractTextFromBuffer(
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          buffer
        );
      }
    } else if (fileExtension === "ppt") {
      // For PPT files, use textract directly
      return await extractTextFromBuffer(
        "application/vnd.ms-powerpoint",
        buffer
      );
    } else {
      throw new Error(`Unsupported file extension: ${fileExtension}`);
    }
  } catch (err) {
    console.error(
      `Error extracting text from ${fileExtension.toUpperCase()}:`,
      err
    );
    throw new Error(
      `Failed to extract text from ${fileExtension.toUpperCase()} file`
    );
  }
}

/**
 * Extract text from a PowerPoint file path
 * @param {string} filePath - Path to the PowerPoint file
 * @returns {Promise<string>} - The extracted text
 */
async function extractTextFromPowerPointFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const fileExtension = filePath.split(".").pop().toLowerCase();

    return await extractTextFromPowerPoint(buffer, fileExtension);
  } catch (err) {
    console.error("Error reading PowerPoint file:", err);
    throw new Error("Failed to read PowerPoint file");
  }
}

module.exports = {
  extractTextFromPPTX,
  extractTextFromPowerPoint,
  extractTextFromPowerPointFile,
};
