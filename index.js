// index.js
require("dotenv").config();

const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const cors = require("cors");
const { extractTextFromPPTX } = require("./pptParser");

const {
  generateResponse,
  generateQuizResponse,
  generateFlashcardsResponse,
  generateReferencesResponse,
} = require("./openai");

const { SYSTEM_PROMPT, PREFIX } = require("./constants");

const app = express();
// Configure CORS to allow specific origins
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://lecture-mate.netlify.app",
      "https://lecturemate2.netlify.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(fileUpload());
app.use(express.json());

/**
 * Safely extracts JSON from GPT output. If invalid or empty, returns [].
 */
function extractJsonFromString(inputString) {
  if (!inputString) return [];
  try {
    const cleanedString = inputString
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();
    return JSON.parse(cleanedString);
  } catch (error) {
    console.error("[extractJsonFromString] Error parsing JSON:", inputString);
    return [];
  }
}

app.post("/extract-text", async (req, res) => {
  if (!req.files || !req.files.pdfFile) {
    return res
      .status(400)
      .send("No file uploaded. Please upload a PDF or PPTX file.");
  }
  try {
    // Check file type and extract text accordingly
    const file = req.files.pdfFile;
    const fileExtension = file.name.split(".").pop().toLowerCase();
    let textContent = "";

    if (fileExtension === "pdf") {
      // Extract text from PDF
      const data = await pdfParse(file.data);
      textContent = data.text || "";
      console.log(
        "[PDF Parse] Extracted text (first 200 chars):",
        textContent.slice(0, 200)
      );
    } else if (fileExtension === "pptx") {
      // Extract text from PPTX
      textContent = await extractTextFromPPTX(file.data);
      console.log(
        "[PPTX Parse] Extracted text (first 200 chars):",
        textContent.slice(0, 200)
      );
    } else {
      return res
        .status(400)
        .send("Unsupported file format. Please upload a PDF or PPTX file.");
    }

    // 2) Lecture Explanation
    const chat = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${PREFIX} ${textContent}`,
      },
    ];
    const gptResponse = await generateResponse(chat);
    console.log("[Lecture Explanation] Raw GPT:", gptResponse);

    // 3) Quiz
    let gptQuizResponse = await generateQuizResponse(textContent);
    console.log("[Quiz Raw]:", gptQuizResponse);
    const quizData = extractJsonFromString(gptQuizResponse);
    console.log("[Quiz Parsed]:", quizData);

    // 4) Flashcards
    let gptFlashcardsResponse = await generateFlashcardsResponse(textContent);
    console.log("[Flashcards Raw]:", gptFlashcardsResponse);
    const flashcardsData = extractJsonFromString(gptFlashcardsResponse);
    console.log("[Flashcards Parsed]:", flashcardsData);

    // 5) References
    let gptReferencesResponse = await generateReferencesResponse(textContent);
    console.log("[References Raw]:", gptReferencesResponse);
    const referencesData = extractJsonFromString(gptReferencesResponse);
    console.log("[References Parsed]:", referencesData);

    // Return all data
    res.json({
      text: gptResponse || "",
      quiz: quizData,
      flashcards: flashcardsData,
      references: referencesData,
      pdfContent: textContent,
    });
  } catch (error) {
    console.error("[/extract-text] Error:", error);
    res.status(500).send("Error processing file");
  }
});

app.post("/get-response", async (req, res) => {
  try {
    if (!req.body.chat) {
      return res.status(400).send("No text");
    }
    const chat = req.body.chat;
    const gptResponse = await generateResponse(chat);
    res.json({ gptResponse: gptResponse });
  } catch (err) {
    console.log("[/get-response] Error:", err);
    res.status(500).send("Error generating");
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running on port 3000")
);
