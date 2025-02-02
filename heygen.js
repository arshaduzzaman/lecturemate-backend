const { Readable } = require("stream");
const fetch = require("node-fetch");
const FormData = require("form-data");

const HEYGEN_API_KEY =
  "NThhZWQ0OWEzYTI1NDA3M2E5OWU5ZTYwOGNjMzk0YTMtMTczMTM0MjY0MQ==";

const TEMPLATE_ID = "2025154ff8ec4618bff5c37fa99f0c15"; // Replace with your specific template ID

async function generateVideoWithAudio(audioBuffer) {
  console.log("Starting video generation with audio...");
  try {
    // Step 1: Upload audio to HeyGen and get asset_id
    const audioAssetId = await uploadAudio(audioBuffer);
    if (!audioAssetId) throw new Error("Audio upload failed.");

    // Step 2: Generate video with template and audio asset
    const videoUrl = await createVideoWithTemplate(audioAssetId);
    return videoUrl;
  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
}

async function uploadAudio(audioBuffer) {
  console.log("Uploading audio directly as a buffer...");

  const response = await fetch("https://upload.heygen.com/v1/asset", {
    method: "POST",
    headers: {
      "x-api-key": HEYGEN_API_KEY,
      "Content-Type": "audio/mpeg",
    },
    body: audioBuffer, // Send the buffer directly
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  const assetId = data.data && data.data.id;
  if (!assetId) {
    throw new Error(data.message || "Audio upload failed.");
  }

  return assetId;
}

async function createVideoWithTemplate(audioAssetId) {
  console.log("Generating video with template...");

  const response = await fetch(`https://api.heygen.com/v2/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key": HEYGEN_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: "Brent_sitting_office_front",
            avatar_style: "normal",
          },
          voice: {
            type: "audio",
            audio_asset_id: audioAssetId,
          },
        },
      ],
      caption: false,
      dimension: {
        width: 1280,
        height: 720,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error response:", errorText);
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  console.log("API Response:", data);
  if (data.error) throw new Error(data.error.message);

  const videoId = data.data.video_id;
  if (!videoId) throw new Error("Failed to retrieve video_id from response.");

  return await getVideoUrl(videoId);
}

async function getVideoUrl(videoId) {
  let status = "waiting";
  let videoUrl = null;
  let retries = 0;
  const maxRetries = 12; // Limit retries to 1 minute (12 * 5 seconds)

  await new Promise((resolve) => setTimeout(resolve, 10000)); // Initial 10-second delay

  while (status === "waiting" || status === "processing") {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds between checks

    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        method: "GET",
        headers: {
          "X-Api-Key": HEYGEN_API_KEY,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("API Response:", data);

    if (data.code !== 100) {
      throw new Error(data.message || "Unknown error occurred.");
    }

    status = data.data.status;
    videoUrl = data.data.video_url;
    retries += 1;

    if (status === "completed" && videoUrl) {
      console.log("Video generation completed.");
      return videoUrl;
    } else if (status === "failed") {
      throw new Error("Video generation failed.");
    }
  }

  throw new Error("Video generation failed or took too long.");
}

module.exports = { generateVideoWithAudio };
