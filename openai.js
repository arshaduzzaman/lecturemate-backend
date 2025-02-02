const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

const generateResponse = async (chat) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    // messages: [
    //   { role: "system", content: "You are a helpful assistant." },
    //   {
    //     role: "user",
    //     content: "Write a haiku about recursion in programming.",
    //   },
    // ],
    messages: chat,
  });

  console.log(completion.choices[0].message.content);

  return completion.choices[0].message.content;
};

const generateQuizResponse = async (content) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Your job is to make 5 quiz questions along with 4 multiple choice questions and the right answer. Here's an example: ```json {[{question: 'What is the name of the dog?', option_a: 'Tom', option_b: 'Jerry', option_c: 'Oggy', option_d: 'cockroach', correct_answer: 'option_a'},{},...]}``` Respond with only the object",
        },
        {
          role: "user",
          content: content,
        },
      ],
    });

    console.log(completion.choices[0].message.content);

    return completion.choices[0].message.content;
  } catch (err) {
    console.log(err);
  }
};

module.exports = { generateResponse, generateQuizResponse };
