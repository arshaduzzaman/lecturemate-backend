// openai.js
require("dotenv").config();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateResponse = async (chat) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: chat,
  });
  console.log(
    "[Lecture Explanation Raw]:",
    completion.choices[0].message.content
  );
  return completion.choices[0].message.content;
  435;
};

const generateQuizResponse = async (content) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
            Your job is to make 5 quiz questions along with 4 multiple-choice options and the right answer.
            Here's an example: 
            \`\`\`json
            [{
              "question": "What is the name of the dog?",
              "option_a": "Tom",
              "option_b": "Jerry",
              "option_c": "Oggy",
              "option_d": "cockroach",
              "correct_answer": "option_a"
            }, ...]
            \`\`\`
            Respond with ONLY the JSON object.
          `,
        },
        {
          role: "user",
          content: content,
        },
      ],
    });
    console.log("[Quiz Raw]:", completion.choices[0].message.content);
    return completion.choices[0].message.content;
  } catch (err) {
    console.log("Error in generateQuizResponse:", err);
    return null;
  }
};

const generateFlashcardsResponse = async (content) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
            Your job is to create exactly 9 flashcards from the provided lecture text.
            Each flashcard must have:
              "question"
              "answer"
            Return ONLY valid JSON. Example:
            [
              {
                "question": "What is X?",
                "answer": "X is..."
              },
              ...
            ]
          `,
        },
        {
          role: "user",
          content: content,
        },
      ],
    });
    console.log("[Flashcards Raw]:", completion.choices[0].message.content);
    return completion.choices[0].message.content;
  } catch (err) {
    console.log("Error in generateFlashcardsResponse:", err);
    return null;
  }
};

const generateReferencesResponse = async (content) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
            You are a helpful assistant.
            The user has provided some lecture content in PDF form.
            Based on that content, please provide up to 5 relevant external links (websites, articles, etc.) 
            where the user can learn more.
            Respond ONLY with valid JSON, in the format:
            [
              {
                "url": "https://some-resource.com",
                "description": "Short summary of what the link covers"
              },
              ...
            ]
          `,
        },
        {
          role: "user",
          content: content,
        },
      ],
    });

    console.log("[References Raw]:", completion.choices[0].message.content);
    return completion.choices[0].message.content;
  } catch (err) {
    console.error("Error in generateReferencesResponse:", err);
    return null;
  }
};

module.exports = {
  generateResponse,
  generateQuizResponse,
  generateFlashcardsResponse,
  generateReferencesResponse,
};
