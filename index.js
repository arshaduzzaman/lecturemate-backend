// index.js

const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const cors = require("cors");

const {
  generateResponse,
  generateQuizResponse,
  generateFlashcardsResponse,
  generateReferencesResponse, // <-- new function
} = require("./openai");

const { SYSTEM_PROMPT, PREFIX } = require("./constants");
const { generateVoice } = require("./eleven_labs");
const { createLipSyncVideo } = require("./magichour");
const { generateVideoWithAudio } = require("./heygen");

const app = express();
app.use(cors());
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
    return res.status(400).send("No PDF file uploaded");
  }
  try {
    // 1) Parse PDF text
    const data = await pdfParse(req.files.pdfFile.data);
    const textContent = data.text || "";

    console.log("[PDF Parse] Extracted text (first 200 chars):", textContent.slice(0, 200));

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
      references: referencesData, // NEW field
      pdfContent: textContent,
    });
  } catch (error) {
    console.error("[/extract-text] Error:", error);
    res.status(500).send("Error parsing PDF");
  }
});

app.post("/generate-audio", async (req, res) => {
  try {
    if (!req.body.text) {
      return res.status(400).send("No text to generate audio");
    }
    const text = req.body.text;
    const audio = await generateVoice(text);
    const video = await generateVideoWithAudio(audio);
    res.json({ videoUrl: video });
  } catch (err) {
    console.log("[/generate-audio] Error generating:", err);
    res.status(500).send("Error generating");
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

app.listen(3000, () => console.log("Server running on port 3000"));






























































































// const express = require("express");
// const fileUpload = require("express-fileupload");
// const pdfParse = require("pdf-parse");
// const fs = require("fs");

// const cors = require("cors");
// const { generateResponse, generateQuizResponse } = require("./openai");
// const { SYSTEM_PROMPT, PREFIX } = require("./constants");
// const { generateVoice } = require("./eleven_labs");
// const { createLipSyncVideo } = require("./magichour");
// const { generateVideoWithAudio } = require("./heygen");

// const app = express();
// app.use(cors());
// app.use(fileUpload());
// app.use(express.json());

// function extractJsonFromString(inputString) {
//   try {
//     // Remove the triple backticks and "json" from the string
//     const cleanedString = inputString
//       .replace(/^```json/, "")
//       .replace(/```$/, "")
//       .trim();

//     // Attempt to parse the cleaned JSON string
//     const jsonData = JSON.parse(cleanedString);
//     return jsonData; // Return the parsed JSON
//   } catch (error) {
//     console.error("Invalid JSON string:", error.message);
//     return null; // Return null if parsing fails
//   }
// }

// app.post("/extract-text", async (req, res) => {
//   if (!req.files || !req.files.pdfFile) {
//     return res.status(400).send("No PDF file uploaded");
//   }
//   try {
//     const data = await pdfParse(req.files.pdfFile.data);
//     const textContent = data.text;
//     const chat = [
//       { role: "system", content: SYSTEM_PROMPT },
//       {
//         role: "user",
//         content: `${PREFIX} ${textContent}`,
//       },
//     ];
//     const gptResponse = await generateResponse(chat);
//     let gptQuizResponse = await generateQuizResponse(textContent);
//     gptQuizResponse = extractJsonFromString(gptQuizResponse);
//     res.json({
//       text: gptResponse,
//       quiz: gptQuizResponse,
//       pdfContent: textContent,
//     });
//   } catch (error) {
//     console.log(error)
//     res.status(500).send("Error parsing PDF");
//   }
// });

// app.post("/generate-audio", async (req, res) => {
//   try {
//     console.log(req.body);
//     if (!req.body.text) {
//       return res.status(400).send("No text to generate audio");
//     }
//     const text = req.body.text;
//     const audio = await generateVoice(text);
//     const video = await generateVideoWithAudio(audio);
//     console.log(video);
//     res.json({ videoUrl: video });
//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Error generating");
//   }
// });

// app.post("/get-response", async (req, res) => {
//   try {
//     console.log(req.body);
//     if (!req.body.chat) {
//       return res.status(400).send("No text");
//     }
//     const chat = req.body.chat;
//     const gptResponse = await generateResponse(chat);

//     res.json({ gptResponse: gptResponse });
//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Error generating");
//   }
// });

// app.listen(3000, () => console.log("Server running on port 3000"));
