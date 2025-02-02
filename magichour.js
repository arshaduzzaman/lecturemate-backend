const axios = require("axios");
const fs = require("fs").promises; // Use promises for async/await
const path = require("path");

const videoFilePath = "resultt.mp4";

const apiKey =
  "mhk_live_XLXKRLVHLLljpu8xzSif8BocIQgZbunStpeLAjWE7hpQCXfr8cIyWAeNMi3kJqnYmNw8wKe1mRy58q6y";

// Function to get upload URLs
async function getUploadUrls() {
  try {
    const response = await axios.post(
      "https://api.magichour.ai/v1/files/upload-urls",
      {
        items: [
          { type: "audio", extension: "mp3" },
          { type: "video", extension: "mp4" },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.items;
  } catch (error) {
    throw new Error(
      `Failed to get upload URLs: ${
        error.response?.data?.message || error.message
      }`
    );
  }
}

// Function to upload a file
async function uploadFile(uploadUrl, fileInput, fileName) {
  try {
    let fileData;

    console.log(fileInput);

    if (Buffer.isBuffer(fileInput)) {
      fileData = fileInput;
    } else if (
      fileInput instanceof ArrayBuffer ||
      ArrayBuffer.isView(fileInput)
    ) {
      fileData = Buffer.from(fileInput);
    } else if (typeof fileInput === "string") {
      fileData = await fs.readFile(fileInput);
    } else {
      throw new Error(
        "fileInput must be a Buffer, ArrayBuffer, or a file path string"
      );
    }

    await axios.put(uploadUrl, fileData, {
      headers: { "Content-Type": "application/octet-stream" },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    console.log(`Uploaded file: ${fileName}`);
  } catch (error) {
    throw new Error(
      `Failed to upload file ${fileName}: ${
        error.response?.data?.message || error.message
      }`
    );
  }
}

// Function to create a lip-sync video
async function createLipSyncVideo(audioFileInput) {
  try {
    // Step 1: Get upload URLs
    const uploadItems = await getUploadUrls();

    const audioItem = uploadItems.find((item) =>
      item.upload_url.includes(".mp3")
    );
    const videoItem = uploadItems.find((item) =>
      item.upload_url.includes(".mp4")
    );

    if (!audioItem || !videoItem) {
      throw new Error("Failed to obtain upload URLs for audio or video files.");
    }

    // Step 2: Upload the files
    await uploadFile(audioItem.upload_url, audioFileInput, "audio.mp3");
    await uploadFile(videoItem.upload_url, videoFilePath, "video.mp4");

    // Step 3: Call the Lip Sync API
    const lipSyncResponse = await axios.post(
      "https://api.magichour.ai/v1/lip-sync",
      {
        name: "Lip Sync Video",
        height: 512,
        width: 960,
        start_seconds: 0,
        end_seconds: 30,
        assets: {
          audio_file_path: audioItem.file_path,
          video_source: "file",
          video_file_path: videoItem.file_path,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Lip Sync Video Created:");
    console.log(`Video ID: ${lipSyncResponse.data.id}`);
    console.log(
      `Estimated Frame Cost: ${lipSyncResponse.data.estimated_frame_cost}`
    );

    // Step 4: Poll the video status and return the download URL
    const downloadUrl = await pollVideoStatus(lipSyncResponse.data.id);
    return downloadUrl;
  } catch (error) {
    console.error(
      `Error creating lip sync video: ${
        error.response?.data?.message || error.message
      }`
    );
    throw error; // Re-throw the error
  }
}

// Function to poll the video status
async function pollVideoStatus(videoId) {
  const statusUrl = `https://api.magichour.ai/v1/video-projects/${videoId}`;
  const pollingInterval = 5000; // Poll every 5 seconds

  console.log("Polling video status...");

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(statusUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        const status = response.data.status;
        console.log(`Current Status: ${status}`);

        if (status === "complete") {
          clearInterval(interval);
          const downloadUrl = response.data.download?.url;
          if (downloadUrl) {
            console.log("Video rendering complete!");
            console.log(`Download URL: ${downloadUrl}`);
            resolve(downloadUrl);
          } else {
            reject("Download URL not available.");
          }
        } else if (status === "error" || status === "canceled") {
          clearInterval(interval);
          reject(`Video processing ${status}.`);
        }
        // Continue polling if status is 'queued' or 'rendering'
      } catch (error) {
        clearInterval(interval);
        reject(
          `Error polling video status: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }, pollingInterval);
  });
}

module.exports = { createLipSyncVideo };
