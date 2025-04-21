// pptParser.js
const JSZip = require("jszip");
const { DOMParser } = require("xmldom");
const fs = require("fs");

/**
 * Extract text from a PowerPoint file
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
 * Extract text from a PowerPoint file path
 * @param {string} filePath - Path to the PowerPoint file
 * @returns {Promise<string>} - The extracted text
 */
async function extractTextFromPPTXFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    return await extractTextFromPPTX(buffer);
  } catch (err) {
    console.error("Error reading PPTX file:", err);
    throw new Error("Failed to read PowerPoint file");
  }
}

module.exports = {
  extractTextFromPPTX,
  extractTextFromPPTXFile,
};
