const { generateVideoWithAudio } = require("./heygen");
const { createLipSyncVideo } = require("./magichour");

const generateVoice = async (text) => {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": "sk_fdce45d99e56d3d0316a0722d1762a89c879f25080ae679d",
    },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_turbo_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.5,
        use_speaker_boost: true,
      },
      seed: 123,
      use_pvc_as_ivc: true,
      apply_text_normalization: "auto",
    }),
  };

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/CwhRBWXzGAHq8TQ4Fs17",
      options
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return audioBuffer;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

module.exports = { generateVoice };
