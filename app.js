'use strict';

import {IndexedDBStorage} from './indexeddb-storage.js';
import * as visualize from './visualize.js';

const DELETE_BUTTON_SELECTOR = '.delete-button';

const recordButton = document.querySelector('#record');
const recordOutlineEl = document.querySelector('#record-outline');
const soundClips = document.querySelector('.sound-clips');
const clipTemplate = document.querySelector('#clip-template');
//var link = document.createElement('a');

document.addEventListener('DOMContentLoaded', init);
/*
// Enable offline support through a ServiceWorker. We register the message
// listener during import time (before DOMContentLoaded), in order to not
// miss messages that are sent during resource loading.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'reload') {
      // The ServiceWorker refreshes cached resources in the background. In
      // case of a cache invalidation, the worker sends a message that
      // instructs the website to reload.
      window.location.reload();
    }
  });
  navigator.serviceWorker.register('./service-worker.js');
}

*//** Initializes the web application. */
async function init() {
  /* global mdc */ // Material Components Web scripts are loaded in index.html.
  new mdc.iconButton.MDCIconButtonToggle(recordButton);
  recordButton.onclick = () => startRecording({storage});

  const storage = new IndexedDBStorage();
  await storage.open();

  for await (const [id, blob] of storage.readAll()) {
    const clipContainer = insertClip();
    finalizeClip({clipContainer, id, blob, storage});
  }
}
//alert("updated");
/**
 * Inserts a new audio clip at the top of the list.
 *
 * @return {HTMLElement} Container element of the audio clip.
*/
function insertClip() {
  const clipContainer = clipTemplate.content.firstElementChild.cloneNode(true);
  soundClips.prepend(clipContainer);
  return clipContainer;
}

/** Finalizes a clip by replacing the visualization with the audio element. */
function finalizeClip({clipContainer, blob, id, storage}) {
  clipContainer.querySelector(DELETE_BUTTON_SELECTOR).onclick = () => {
    clipContainer.parentNode.removeChild(clipContainer);
    storage.delete(parseInt(id));
  };
  clipContainer.getElementsByClassName('play-clip')[0].onclick = () => {
    //const audioCtx = new AudioContext();
    //alert("Hello");
    handleClip(blob);
  };
  clipContainer.querySelector('audio').src = URL.createObjectURL(blob);
  clipContainer.classList.remove('clip-recording');
}

/** Accesses the device's microphone and returns an audio stream.
 *
 * @return {Promise<MediaStream>|null} Promise with MediaStream or
 *   null on error.
 */
async function getAudioStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({audio: true});
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Starts recording an audio snippet in-memory and visualizes the recording
 * waveform.
 */
async function startRecording({storage}) {
  const chunks = [];
  const stream = await getAudioStream();
  if (!stream) {
    return; // Permissions have not been granted or an error occurred.
  }

  const clipContainer = insertClip();
  const canvas = clipContainer.querySelector('canvas');
  canvas.width = clipContainer.offsetWidth;

  const outlineIndicator = new visualize.OutlineLoudnessIndicator(
      recordOutlineEl);
  const waveformIndicator = new visualize.WaveformIndicator(canvas);

  // Start recording the microphone's audio stream in-memory.
  const mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = ({data}) => {
    chunks.push(data);
  };
  mediaRecorder.onstop = async () => {
    outlineIndicator.hide();
    recordButton.onclick = () => startRecording({storage});
    const blob = new Blob(chunks);//, {type: 'audio/wav'});//mediaRecorder.mimeType});
    const id = await storage.save(blob);
    finalizeClip({clipContainer, id, blob, storage});
  };
  mediaRecorder.start();

  recordButton.onclick = () => {
    // Stop the audio track to remove the browser's recording indicator and
    // stop the MediaRecorder.
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  };

  visualizeRecording({stream, outlineIndicator, waveformIndicator});
}

/** Visualizes the audio with a waveform and a loudness indicator. */
function visualizeRecording({stream, outlineIndicator, waveformIndicator}) {
  // Use AnalyserNode to compute the recorded audio's power to visualize
  // loudness.
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 32; // Smallest possible FFT size for cheaper computation.
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  waveformIndicator.drawCenterLine();

  /** Repeatedly draws the waveform and loudness indicator. */
  function draw() {
    if (!stream.active) {
      return; // Stop drawing loop once the recording stopped.
    }

    analyser.getByteFrequencyData(dataArray);
    const loudness = visualize.calculateLoudness(dataArray);
    outlineIndicator.show(loudness);
    waveformIndicator.show(loudness);

    requestAnimationFrame(draw);
  }

  draw();
}

async function handleClip(blob) {

const audioContext = new AudioContext()
const fileReader = new FileReader()

// Set up file reader on loaded end event
fileReader.onloadend = () => {

    const arrayBuffer = fileReader.result //as ArrayBuffer

    // Convert array buffer into audio buffer
    audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {

      // Do something with audioBuffer
      console.log(audioBuffer)
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);

    })

}

//Load blob
fileReader.readAsArrayBuffer(blob)
  
}


