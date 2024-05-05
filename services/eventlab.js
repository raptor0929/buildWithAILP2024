const fs = require('node:fs')
/**
 *
 * @param {*} voiceId clone voice vwfl76D5KBjKuSGfTbLB
 * @returns
 */
const textToVoice = async (text, voiceId = 'IKne3meq5aSn9XLyUdCD') => {
  const EVENT_TOKEN = process.env.EVENT_TOKEN ?? "";
  const urlObj = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  const queryParams = {
    optimize_streaming_latency: 0,
    output_format: 'mp3_44100_128'
  };
  
  // Add query parameters
  Object.keys(queryParams).forEach(key => urlObj.searchParams.append(key, queryParams[key]));

  const header = new Headers();
  header.append("accept", "audio/mpeg");
  header.append("xi-api-key", EVENT_TOKEN);
  header.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    text,
    model_id: "eleven_multilingual_v1",
    voice_settings: {
      stability: 0,
      similarity_boost: 0,
      style: 0,
      use_speaker_boost: true
    },
  });

  const requestOptions = {
    method: "POST",
    headers: header,
    body: raw,
    redirect: "follow",
  };

  console.log('final URL= ', urlObj.toString());
  console.log('final requestOptions = ' + requestOptions);
  const response = await fetch(urlObj.toString(), requestOptions);
  // console.log(await response.json());
  const buffer = await response.arrayBuffer();
  const pathFile = `${process.cwd()}/tmp/${Date.now()}-audio.mp3`;
  fs.writeFileSync(pathFile, Buffer.from(buffer));
  
  return pathFile;
};

module.exports = { textToVoice };
