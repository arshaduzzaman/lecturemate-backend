const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const fs = require("fs");

const cors = require("cors");
const { generateResponse, generateQuizResponse } = require("./openai");
const { SYSTEM_PROMPT, PREFIX } = require("./constants");
const { generateVoice } = require("./eleven_labs");
const { createLipSyncVideo } = require("./magichour");
const { generateVideoWithAudio } = require("./heygen");

const app = express();
app.use(cors());
app.use(fileUpload());
app.use(express.json());

function extractJsonFromString(inputString) {
  try {
    // Remove the triple backticks and "json" from the string
    const cleanedString = inputString
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();

    // Attempt to parse the cleaned JSON string
    const jsonData = JSON.parse(cleanedString);
    return jsonData; // Return the parsed JSON
  } catch (error) {
    console.error("Invalid JSON string:", error.message);
    return null; // Return null if parsing fails
  }
}

app.post("/extract-text", async (req, res) => {
  if (!req.files || !req.files.pdfFile) {
    return res.status(400).send("No PDF file uploaded");
  }
  try {
    const data = await pdfParse(req.files.pdfFile.data);
    const textContent = data.text;
    const chat = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${PREFIX} ${textContent}`,
      },
    ];
    const gptResponse = await generateResponse(chat);
    let gptQuizResponse = await generateQuizResponse(textContent);
    gptQuizResponse = extractJsonFromString(gptQuizResponse);
    res.json({
      text: gptResponse,
      quiz: gptQuizResponse,
      pdfContent: textContent,
    });
  } catch (error) {
    res.status(500).send("Error parsing PDF");
  }
});

app.post("/generate-audio", async (req, res) => {
  try {
    console.log(req.body);
    if (!req.body.text) {
      return res.status(400).send("No text to generate audio");
    }
    const text = req.body.text;
    const audio = await generateVoice(text);
    const video = await generateVideoWithAudio(audio);
    console.log(video);
    res.json({ videoUrl: video });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error generating");
  }
});

app.post("/get-response", async (req, res) => {
  try {
    console.log(req.body);
    if (!req.body.chat) {
      return res.status(400).send("No text");
    }
    const chat = req.body.chat;
    const gptResponse = await generateResponse(chat);

    res.json({ gptResponse: gptResponse });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error generating");
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
