/* =========================================
   客語翻牌小遊戲
========================================= */

const TOTAL_PAIRS = 6;

/* 跈龍隊伍圖片 */
const DRAGON_IMAGE = "images/跈龍隊伍.png";

/* 終點旗子圖片 */
const FINISH_FLAG_IMAGE = "images/終點旗子.png";

let cards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;

let currentAudio = null;

let selectedReviewWords = [];
let reviewIndex = 0;
let recognition = null;
let speechPinyinVisible = false;
let speechRecognitionActive = false;
let speechAudioContext = null;
let speechInputSource = null;
let speechProcessor = null;
let speechSilentGain = null;
let speechMicStream = null;
let speechPCMChunks = [];
let speechInputSampleRate = 0;
let speechRecordStartedAt = 0;
let speechAutoStopTimer = null;

const SPEECH_PASS_SCORE = 50;


/* =========================================
   頁面切換
========================================= */

function hideAllPages() {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });
}


function showPage(id) {
  hideAllPages();

  const page = document.getElementById(id);

  if (page) {
    page.classList.add("active");
  }
}


/* =========================================
   音效
========================================= */

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}




function playInstructionAudio() {

  stopAudio();

  currentAudio = new Audio("./audio/遊戲說明.mp3");

  currentAudio.volume = 1;

  currentAudio.play()
    .then(() => {

      console.log("遊戲說明音檔播放成功");

    })
    .catch(error => {

      console.log("遊戲說明音檔播放失敗：", error);

    });
}
/*
  播放客語詞彙*/


function playHakkaAudio(fileName) {

  if (!fileName) {
    return;
  }

  stopAudio();

  currentAudio = new Audio(
    "./audio/" + encodeURIComponent(fileName)
  );

  currentAudio.volume = 1;

  currentAudio.play().catch(error => {
    console.log("客語音檔無法播放：", error);
  });
}


/* =========================================
   首頁 → 遊戲說明
========================================= */

function showInstructions() {

  showPage("instructionPage");

  playInstructionAudio();
}



/* =========================================
   首頁 → 認識詞彙
========================================= */

function showVocabulary() {

  stopAudio();

  showPage("vocabularyPage");

  createVocabularyList();
}


/* =========================================
   建立詞彙列表
========================================= */

function createVocabularyList() {

  const list = document.getElementById("vocabularyList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (
    typeof WORDS === "undefined" ||
    !Array.isArray(WORDS)
  ) {
    list.innerHTML = `
      <p>
        找不到詞彙資料，請確認 words.js 是否正確載入。
      </p>
    `;
    return;
  }

  WORDS.forEach(word => {

    const card = document.createElement("div");

    card.className = "word-card";

    card.innerHTML = `
      <img
        class="word-image"
        src="./images/${word.image}"
        alt="${word.chinese}"
      >

      <div class="word-chinese">
        ${word.chinese}
      </div>

      <div class="word-hakka">
        ${word.hakka}
      </div>

      <div class="audio-hint">
        🔊 聽聲音
      </div>
    `;

    card.addEventListener("click", () => {
      playHakkaAudio(word.audio);
    });

    list.appendChild(card);
  });
}


/* =========================================
   開始遊戲
========================================= */

function startGame() {

  stopAudio();

  showPage("gamePage");

  startNewGame();
}


/* =========================================
   建立新遊戲
========================================= */

function startNewGame() {

  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;

  const game = document.getElementById("game");
  const message = document.getElementById("message");

  if (!game) {
    return;
  }

  game.innerHTML = "";

  if (message) {
    message.textContent = "";
  }

  updateProgress();

  /*
    從 WORDS 隨機選出 6 組
  */

  const selectedWords = shuffle(
    [...WORDS]
  ).slice(0, TOTAL_PAIRS);

  /*
    保留本次遊戲的 6 組詞彙，
    後面的語音挑戰沿用同一批詞彙。
  */
  selectedReviewWords = [...selectedWords];
  reviewIndex = 0;


  /*
    每一組建立：
    1. 中文牌
    2. 客語拼音牌
  */

  cards = [];

  selectedWords.forEach((word, index) => {

    cards.push({
      ...word,
      pairId: index,
      type: "chinese"
    });

    cards.push({
      ...word,
      pairId: index,
      type: "hakka"
    });

  });


  /*
    打亂全部卡片
  */

  cards = shuffle(cards);


  /*
    顯示卡片
  */

  cards.forEach((cardData, index) => {

    const cardElement =
      createCard(cardData, index);

    game.appendChild(cardElement);

  });
}


/* =========================================
   建立一張卡片
========================================= */

function createCard(cardData, index) {

  const card = document.createElement("div");

  card.className = "card";

  card.dataset.index = index;
  card.dataset.pairId = cardData.pairId;
  card.dataset.type = cardData.type;

  let backContent = "";


  /* -------------------------
     中文牌
  ------------------------- */

  if (cardData.type === "chinese") {

    backContent = `
      <div class="card-back chinese-back">

        <img
          class="card-word-image"
          src="./images/${cardData.image}"
          alt="${cardData.chinese}"
        >

        <div class="card-chinese">
          ${cardData.chinese}
        </div>

      </div>
    `;

  }


  /* -------------------------
     客語拼音牌
  ------------------------- */

  else {

    backContent = `
      <div class="card-back hakka-back">

        <div class="card-hakka-label">
          客語拼音
        </div>

        <div class="card-hakka">
          ${cardData.hakka}
        </div>

        <button
          type="button"
          class="audio-button">
          🔊 聽聲音
        </button>

      </div>
    `;
  }


  card.innerHTML = `

    <div class="card-inner">

      <div class="card-front">
        ?
      </div>

      ${backContent}

    </div>

  `;


  /*
    點擊整張卡片翻牌
  */

  card.addEventListener("click", () => {

    flipCard(card, cardData);

  });


  /*
    客語牌的「聽聲音」按鈕
  */

  if (cardData.type === "hakka") {

    const audioButton =
      card.querySelector(".audio-button");

    audioButton.addEventListener("click", event => {

      /*
        不讓按鈕點擊同時觸發翻牌
      */
      event.stopPropagation();

      playHakkaAudio(cardData.audio);

    });

  }


  return card;
}


/* =========================================
   翻牌
========================================= */

function flipCard(card, cardData) {

  if (lockBoard) {
    return;
  }

  if (card.classList.contains("flipped")) {
    return;
  }

  if (card.classList.contains("matched")) {
    return;
  }

  /*
    第一張牌
  */

  if (!firstCard) {

    firstCard = {
      element: card,
      data: cardData
    };

    card.classList.add("flipped");

    /*
      如果是客語牌，翻牌時播放聲音
    */

    if (cardData.type === "hakka") {
      playHakkaAudio(cardData.audio);
    }

    return;
  }


  /*
    第二張牌
  */

  secondCard = {
    element: card,
    data: cardData
  };

  card.classList.add("flipped");

  /*
    如果第二張也是客語牌，播放聲音
  */

  if (cardData.type === "hakka") {
    playHakkaAudio(cardData.audio);
  }

  checkForMatch();
}


/* =========================================
   判斷配對
========================================= */

function checkForMatch() {

  lockBoard = true;

  const isMatch =
    firstCard.data.pairId === secondCard.data.pairId &&
    firstCard.data.type !== secondCard.data.type;


  if (isMatch) {

    handleMatch();

  } else {

    setTimeout(() => {

      firstCard.element.classList.remove("flipped");
      secondCard.element.classList.remove("flipped");

      resetBoard();

    }, 1000);

  }
}


/* =========================================
   配對成功
========================================= */

function handleMatch() {

  firstCard.element.classList.add("matched");
  secondCard.element.classList.add("matched");

  matchedPairs++;

  updateProgress();

  const message =
    document.getElementById("message");

  if (message) {

    if (matchedPairs < TOTAL_PAIRS) {

      message.textContent =
        `🎉 配對成功！龍隊繼續前進！`;

    } else {

      message.textContent =
        "🎉 全部配對成功！龍隊抵達終點！";

    }

  }


  resetBoard();


  /*
    全部完成
  */

  if (matchedPairs === TOTAL_PAIRS) {

    setTimeout(() => {

      showSpeechIntro();

    }, 1000);

  }
}


/* =========================================
   重設翻牌狀態
========================================= */

function resetBoard() {

  firstCard = null;
  secondCard = null;
  lockBoard = false;
}


/* =========================================
   更新跈龍進度
========================================= */

function updateProgress() {

  const progressTrack =
    document.getElementById("progressTrack");

  if (!progressTrack) {
    return;
  }


  const percent =
    (matchedPairs / TOTAL_PAIRS) * 100;


  /*
    更新進度條
  */

  progressTrack.style.setProperty(
    "--progress",
    `${percent}%`
  );


  /*
    確保圖片檔名正確
  */

  const dragonRunner =
    document.getElementById("dragonRunner");

  if (dragonRunner) {

    dragonRunner.src =
      DRAGON_IMAGE;

  }


  /*
    確保終點旗子圖片正確
  */

  const finishFlag =
    document.querySelector(".finish-flag");

  if (finishFlag) {

    finishFlag.src =
      FINISH_FLAG_IMAGE;

  }
}


/* =========================================
   完成頁
========================================= */

function showFinish() {

  stopAudio();

  showPage("finishPage");
}


/* =========================================
   再玩一次
========================================= */

function restartGame() {

  stopAudio();

  showPage("gamePage");

  startNewGame();
}


/* =========================================
   回首頁
========================================= */

function backToStart() {

  stopAudio();
  stopSpeechRecognition();

  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;
  reviewIndex = 0;

  showPage("startPage");
}


/* =========================================
   語音挑戰（新增）
   不修改原本翻牌遊戲流程，只在 6 組配對完成後進入
========================================= */

function showSpeechIntro() {
  stopAudio();
  stopSpeechRecognition();

  if (!selectedReviewWords || selectedReviewWords.length === 0) {
    showFinish();
    return;
  }

  reviewIndex = 0;
  showPage("speechIntroPage");
}


function startSpeechChallenge() {
  if (!selectedReviewWords || selectedReviewWords.length === 0) {
    showFinish();
    return;
  }

  reviewIndex = 0;
  speechPinyinVisible = false;
  showPage("speechPage");
  renderSpeechQuestion();
}


function renderSpeechQuestion() {
  const word = selectedReviewWords[reviewIndex];
  if (!word) {
    finishSpeechChallenge();
    return;
  }

  stopAudio();
  stopSpeechRecognition();

  speechPinyinVisible = false;

  const progressText = document.getElementById("speechProgressText");
  const dots = document.getElementById("speechDots");
  const image = document.getElementById("speechImage");
  const speechWord = document.getElementById("speechWord");
  const pinyin = document.getElementById("speechPinyin");
  const status = document.getElementById("speechStatus");
  const error = document.getElementById("speechError");
  const pinyinButton = document.getElementById("speechPinyinButton");
  const listenButton = document.getElementById("speechListenButton");
  const talkButton = document.getElementById("speechTalkButton");

  if (progressText) {
    progressText.textContent = `第 ${reviewIndex + 1} / ${selectedReviewWords.length} 題`;
  }

  if (dots) {
    dots.innerHTML = selectedReviewWords.map((_, index) => {
      return `<span class="${index === reviewIndex ? "active" : ""}">●</span>`;
    }).join("");
  }

  if (image) {
    image.src = `./images/${word.image}`;
    image.alt = word.chinese || "客語詞彙圖片";
  }

  if (speechWord) {
    speechWord.textContent = word.chinese || "";
  }

  if (pinyin) {
    pinyin.textContent = "";
  }

  if (pinyinButton) {
    pinyinButton.textContent = "👀 顯示拼音";
  }

  if (status) {
    status.textContent = "先聽一次，再按「開始念」喔！";
  }

  if (error) {
    error.textContent = "";
  }

  if (listenButton) {
    listenButton.disabled = false;
  }

  if (talkButton) {
    talkButton.disabled = false;
    talkButton.textContent = "🎤 開始念";
  }

  // 進入題目時自動播放一次既有的客語音檔。
  setTimeout(() => {
    listenSpeechWord();
  }, 250);
}


function listenSpeechWord() {
  const word = selectedReviewWords[reviewIndex];
  if (!word) return;

  playHakkaAudio(word.audio);

  const status = document.getElementById("speechStatus");
  if (status && !speechRecognitionActive) {
    status.textContent = "👂 仔細聽聽看，準備好就按「開始念」！";
  }
}


function toggleSpeechPinyin() {
  const word = selectedReviewWords[reviewIndex];
  const pinyin = document.getElementById("speechPinyin");
  const button = document.getElementById("speechPinyinButton");

  if (!word || !pinyin || !button) return;

  speechPinyinVisible = !speechPinyinVisible;

  if (speechPinyinVisible) {
    pinyin.textContent = word.hakka || "";
    button.textContent = "🙈 隱藏拼音";
  } else {
    pinyin.textContent = "";
    button.textContent = "👀 顯示拼音";
  }
}


function getSpeechRecognition() {
  /*
    保留這個函式名稱是為了相容舊程式。
    這一版不再使用 SpeechRecognition 把客語轉成中文。
  */
  return null;
}


function setSpeechUI(statusText, errorText = "", scoreText = "") {
  const status = document.getElementById("speechStatus");
  const error = document.getElementById("speechError");
  const result = document.getElementById("speechRecognizedText");

  if (status) status.textContent = statusText || "";
  if (error) error.textContent = errorText || "";

  if (result) {
    result.textContent = scoreText || "";
    result.classList.toggle("has-result", Boolean(scoreText));
  }
}


/*
  這一版改成「直接抓麥克風 PCM」。
  不再經過 MediaRecorder → webm/ogg → decodeAudioData，
  可避免部分瀏覽器錄得到但無法解碼錄音檔的問題。
*/
async function startSpeechRecognition() {
  const talkButton = document.getElementById("speechTalkButton");
  const listenButton = document.getElementById("speechListenButton");
  const word = selectedReviewWords[reviewIndex];

  if (!word) return;

  if (speechRecognitionActive) {
    await stopSpeechPCMRecording(true);
    return;
  }

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    setSpeechUI(
      "🎤 這個瀏覽器無法使用麥克風。",
      "建議使用最新版 Chrome 或 Edge。"
    );
    return;
  }

  if (
    !window.isSecureContext &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1"
  ) {
    setSpeechUI(
      "🔒 目前頁面不是安全來源。",
      "如果要使用 GitHub，請從 GitHub Pages 的 https:// 網址開啟；本機請使用 localhost。"
    );
    return;
  }

  stopAudio();
  stopSpeechRecognition();

  try {
    speechMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true
      }
    });
  } catch (error) {
    setSpeechUI(
      "🎤 無法取得麥克風聲音。",
      `瀏覽器回報：${error && error.name ? error.name : "未知錯誤"}。`
    );
    return;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    releaseSpeechPCM();
    setSpeechUI(
      "⚠️ 此瀏覽器沒有 Web Audio API。",
      "請使用最新版 Chrome 或 Edge。"
    );
    return;
  }

  try {
    speechAudioContext = new AudioContextClass();

    if (speechAudioContext.state === "suspended") {
      await speechAudioContext.resume();
    }

    speechInputSampleRate = speechAudioContext.sampleRate;
    speechPCMChunks = [];

    speechInputSource =
      speechAudioContext.createMediaStreamSource(
        speechMicStream
      );

    /*
      ScriptProcessor 雖然是舊 API，
      但目前 Chrome / Edge / Firefox 支援度很高，
      很適合不需要外部函式庫的 GitHub Pages 小遊戲。
    */
    speechProcessor =
      speechAudioContext.createScriptProcessor(
        2048,
        1,
        1
      );

    speechSilentGain =
      speechAudioContext.createGain();

    speechSilentGain.gain.value = 0;

    speechProcessor.onaudioprocess = event => {
      if (!speechRecognitionActive) return;

      const input =
        event.inputBuffer.getChannelData(0);

      speechPCMChunks.push(
        new Float32Array(input)
      );
    };

    speechInputSource.connect(
      speechProcessor
    );

    speechProcessor.connect(
      speechSilentGain
    );

    speechSilentGain.connect(
      speechAudioContext.destination
    );

    speechRecognitionActive = true;
    speechRecordStartedAt = performance.now();

    if (talkButton) {
      talkButton.disabled = false;
      talkButton.textContent =
        "⏹️ 停止錄音並比對";
    }

    if (listenButton) {
      listenButton.disabled = true;
    }

    setSpeechUI(
      "🎤 正在錄音……請完整念一次客語詞彙。",
      "念完後按「停止錄音並比對」。"
    );

    speechAutoStopTimer = setTimeout(() => {
      if (speechRecognitionActive) {
        stopSpeechPCMRecording(true);
      }
    }, 5000);

  } catch (error) {
    console.error(error);
    releaseSpeechPCM();

    setSpeechUI(
      "⚠️ 無法啟動錄音分析。",
      `瀏覽器回報：${error && error.message ? error.message : "未知錯誤"}`
    );
  }
}


async function stopSpeechPCMRecording(showComparing = false) {
  if (!speechRecognitionActive) return;

  clearTimeout(speechAutoStopTimer);
  speechAutoStopTimer = null;

  speechRecognitionActive = false;

  const elapsed =
    performance.now() -
    speechRecordStartedAt;

  const chunks =
    speechPCMChunks.slice();

  const inputRate =
    speechInputSampleRate;

  releaseSpeechPCM();

  const talkButton =
    document.getElementById(
      "speechTalkButton"
    );

  const listenButton =
    document.getElementById(
      "speechListenButton"
    );

  if (talkButton) {
    talkButton.disabled = true;
    talkButton.textContent =
      "🔎 比對中…";
  }

  if (listenButton) {
    listenButton.disabled = true;
  }

  if (showComparing) {
    setSpeechUI(
      "🔎 錄音完成，正在和標準客語音檔比對……"
    );
  }

  if (
    chunks.length === 0 ||
    elapsed < 350
  ) {
    setSpeechRetry(
      "🤔 沒有錄到足夠的聲音，請再試一次。"
    );
    return;
  }

  const userPCM =
    mergeSpeechPCMChunks(chunks);

  await compareSpeechPCMWithReference(
    userPCM,
    inputRate,
    selectedReviewWords[reviewIndex]
  );
}


function mergeSpeechPCMChunks(chunks) {
  let totalLength = 0;

  for (const chunk of chunks) {
    totalLength += chunk.length;
  }

  const output =
    new Float32Array(totalLength);

  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}


function releaseSpeechPCM() {
  try {
    if (speechInputSource) {
      speechInputSource.disconnect();
    }
  } catch (error) {}

  try {
    if (speechProcessor) {
      speechProcessor.onaudioprocess = null;
      speechProcessor.disconnect();
    }
  } catch (error) {}

  try {
    if (speechSilentGain) {
      speechSilentGain.disconnect();
    }
  } catch (error) {}

  if (speechMicStream) {
    speechMicStream
      .getTracks()
      .forEach(track => track.stop());
  }

  if (speechAudioContext) {
    try {
      speechAudioContext.close();
    } catch (error) {}
  }

  speechAudioContext = null;
  speechInputSource = null;
  speechProcessor = null;
  speechSilentGain = null;
  speechMicStream = null;
  speechPCMChunks = [];
  speechInputSampleRate = 0;
}


function stopSpeechRecognition() {
  speechRecognitionActive = false;

  clearTimeout(
    speechAutoStopTimer
  );

  speechAutoStopTimer = null;

  releaseSpeechPCM();

  /*
    舊版 recognition 若還存在，
    也一起停止，避免舊程式殘留。
  */
  if (recognition) {
    try {
      recognition.stop();
    } catch (error) {}

    recognition = null;
  }
}


function setSpeechRetry(
  message,
  detail = "",
  scoreText = ""
) {
  const talkButton =
    document.getElementById(
      "speechTalkButton"
    );

  const listenButton =
    document.getElementById(
      "speechListenButton"
    );

  setSpeechUI(
    message,
    detail,
    scoreText
  );

  if (talkButton) {
    talkButton.disabled = false;
    talkButton.textContent =
      "🎤 再念一次";
  }

  if (listenButton) {
    listenButton.disabled = false;
  }
}


async function compareSpeechPCMWithReference(
  userPCM,
  userSampleRate,
  word
) {
  try {
    if (!word || !word.audio) {
      throw new Error(
        "這一題沒有設定 audio"
      );
    }

    setSpeechUI(
      "🔎 正在分析你的客語發音……"
    );

    /*
      先確認標準 WAV 是否真的能從 GitHub Pages 讀到。
    */
    const referenceUrl =
      `./audio/${encodeURIComponent(
        word.audio
      )}`;

    const referenceBuffer =
      await loadSpeechReferenceAudio(
        referenceUrl
      );

    const referenceSamples =
      preprocessSpeechAudioBuffer(
        referenceBuffer
      );

    let userSamples =
      resampleSpeechPCM(
        userPCM,
        userSampleRate,
        16000
      );

    userSamples =
      trimSpeechSilence(
        userSamples,
        16000
      );

    userSamples =
      normalizeSpeechVolume(
        userSamples
      );

    if (
      referenceSamples.length <
      3200
    ) {
      throw new Error(
        `標準音檔 ${word.audio} 的有效聲音太短`
      );
    }

    if (
      userSamples.length <
      1200
    ) {
      setSpeechRetry(
        "🤔 錄到的聲音太短或太小聲。",
        "請靠近麥克風，把整個詞念完後再按停止。"
      );
      return;
    }

    const referenceFeatures =
      speechMFCC(
        referenceSamples,
        16000
      );

    const userFeatures =
      speechMFCC(
        userSamples,
        16000
      );

    if (
      referenceFeatures.length < 8 ||
      userFeatures.length < 8
    ) {
      setSpeechRetry(
        "🤔 聲音資料不足，請再念一次。"
      );
      return;
    }

    const distance =
      speechDTWDistance(
        referenceFeatures,
        userFeatures
      );

    const durationRatio =
      Math.min(
        referenceSamples.length,
        userSamples.length
      ) /
      Math.max(
        referenceSamples.length,
        userSamples.length
      );

    /*
      distance 越小表示越相似。
      durationRatio 只做小幅度修正，
      不會要求玩家和標準音檔語速完全相同。
    */
    let similarity =
      100 *
      Math.exp(
        -1.20 * distance
      ) *
      (
        0.84 +
        0.16 *
        durationRatio
      );

    similarity =
      Math.max(
        0,
        Math.min(
          100,
          similarity
        )
      );

    const scoreText =
      `🔊 聲音相似度：${similarity.toFixed(0)}%`;

    if (
      similarity >=
      SPEECH_PASS_SCORE
    ) {
      const talkButton =
        document.getElementById(
          "speechTalkButton"
        );

      const listenButton =
        document.getElementById(
          "speechListenButton"
        );

      setSpeechUI(
        "🎉 通過！發音和標準客語音檔很接近。",
        "龍隊繼續前進！",
        scoreText
      );

      if (talkButton) {
        talkButton.disabled = true;
      }

      if (listenButton) {
        listenButton.disabled = true;
      }

      setTimeout(() => {
        reviewIndex++;

        if (
          reviewIndex >=
          selectedReviewWords.length
        ) {
          finishSpeechChallenge();
        } else {
          renderSpeechQuestion();
        }
      }, 1000);

      return;
    }

    setSpeechRetry(
      "🤔 再試一次！",
      "可以先按「聽客語」再聽一次，再慢慢把整個詞念完。",
      scoreText
    );

  } catch (error) {
    console.error(
      "客語聲音比對失敗：",
      error
    );

    setSpeechRetry(
      `⚠️ 無法完成「${word ? word.chinese : "這一題"}」的聲音比對。`,
      `${error && error.message ? error.message : ""} 請確認 audio/${word && word.audio ? word.audio : "詞彙.wav"} 已上傳到 GitHub Pages。`
    );
  }
}


async function loadSpeechReferenceAudio(url) {
  const response =
    await fetch(
      url,
      { cache: "no-store" }
    );

  if (!response.ok) {
    throw new Error(
      `標準音檔讀取失敗：HTTP ${response.status}`
    );
  }

  const bytes =
    await response.arrayBuffer();

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error(
      "瀏覽器不支援 Web Audio API"
    );
  }

  const context =
    new AudioContextClass();

  try {
    if (
      context.state ===
      "suspended"
    ) {
      await context.resume();
    }

    return await context.decodeAudioData(
      bytes.slice(0)
    );

  } finally {
    try {
      await context.close();
    } catch (error) {}
  }
}


function preprocessSpeechAudioBuffer(
  buffer
) {
  const targetRate = 16000;

  let mono =
    new Float32Array(
      buffer.length
    );

  for (
    let channelIndex = 0;
    channelIndex <
    buffer.numberOfChannels;
    channelIndex++
  ) {
    const channel =
      buffer.getChannelData(
        channelIndex
      );

    for (
      let i = 0;
      i < channel.length;
      i++
    ) {
      mono[i] +=
        channel[i] /
        buffer.numberOfChannels;
    }
  }

  mono =
    resampleSpeechPCM(
      mono,
      buffer.sampleRate,
      targetRate
    );

  mono =
    trimSpeechSilence(
      mono,
      targetRate
    );

  mono =
    normalizeSpeechVolume(
      mono
    );

  const maxLength =
    targetRate * 5;

  if (
    mono.length >
    maxLength
  ) {
    mono =
      mono.slice(
        0,
        maxLength
      );
  }

  return mono;
}


function resampleSpeechPCM(
  input,
  fromRate,
  toRate
) {
  if (
    fromRate === toRate
  ) {
    return input;
  }

  const newLength =
    Math.max(
      1,
      Math.round(
        input.length *
        toRate /
        fromRate
      )
    );

  const output =
    new Float32Array(
      newLength
    );

  const ratio =
    fromRate /
    toRate;

  for (
    let i = 0;
    i < newLength;
    i++
  ) {
    const position =
      i * ratio;

    const left =
      Math.floor(
        position
      );

    const right =
      Math.min(
        left + 1,
        input.length - 1
      );

    const fraction =
      position - left;

    output[i] =
      input[left] *
      (1 - fraction) +
      input[right] *
      fraction;
  }

  return output;
}


function trimSpeechSilence(
  input,
  sampleRate
) {
  let peak = 0;

  for (
    const value of input
  ) {
    peak =
      Math.max(
        peak,
        Math.abs(value)
      );
  }

  if (
    peak < 0.0008
  ) {
    return new Float32Array(0);
  }

  const threshold =
    Math.max(
      0.001,
      peak * 0.015
    );

  let start = 0;
  let end =
    input.length - 1;

  while (
    start <
    input.length &&
    Math.abs(
      input[start]
    ) <
    threshold
  ) {
    start++;
  }

  while (
    end > start &&
    Math.abs(
      input[end]
    ) <
    threshold
  ) {
    end--;
  }

  const padding =
    Math.round(
      sampleRate *
      0.10
    );

  start =
    Math.max(
      0,
      start - padding
    );

  end =
    Math.min(
      input.length - 1,
      end + padding
    );

  return input.slice(
    start,
    end + 1
  );
}


function normalizeSpeechVolume(
  input
) {
  if (!input.length) {
    return input;
  }

  let energy = 0;

  for (
    const value of input
  ) {
    energy +=
      value * value;
  }

  const rms =
    Math.sqrt(
      energy /
      input.length
    ) || 1;

  const gain =
    Math.min(
      8,
      0.12 / rms
    );

  const output =
    new Float32Array(
      input.length
    );

  for (
    let i = 0;
    i < input.length;
    i++
  ) {
    output[i] =
      input[i] *
      gain;
  }

  return output;
}


/*
  MFCC：
  將聲音轉成語音頻譜包絡，
  再用 DTW 對齊不同語速。
*/
function speechMFCC(
  samples,
  sampleRate
) {
  const frameSize = 512;
  const hopSize = 160;
  const filterCount = 26;
  const coefficientCount = 13;

  const filterBank =
    createSpeechMelFilterBank(
      sampleRate,
      frameSize,
      filterCount
    );

  const features = [];

  for (
    let position = 0;
    position + frameSize <=
    samples.length;
    position += hopSize
  ) {
    const frame =
      new Float64Array(
        frameSize
      );

    let energy = 0;

    for (
      let i = 0;
      i < frameSize;
      i++
    ) {
      const windowValue =
        0.54 -
        0.46 *
        Math.cos(
          2 *
          Math.PI *
          i /
          (frameSize - 1)
        );

      const value =
        samples[
          position + i
        ] *
        windowValue;

      frame[i] = value;
      energy +=
        value * value;
    }

    if (
      energy < 1e-7
    ) {
      continue;
    }

    const {
      real,
      imag
    } =
      speechFFT(frame);

    const power =
      new Float64Array(
        frameSize / 2 + 1
      );

    for (
      let k = 0;
      k < power.length;
      k++
    ) {
      power[k] =
        (
          real[k] *
          real[k] +
          imag[k] *
          imag[k]
        ) /
        frameSize;
    }

    const melEnergies =
      new Float64Array(
        filterCount
      );

    for (
      let m = 0;
      m < filterCount;
      m++
    ) {
      let sum = 0;

      for (
        let k = 0;
        k < power.length;
        k++
      ) {
        sum +=
          power[k] *
          filterBank[m][k];
      }

      melEnergies[m] =
        Math.log(
          Math.max(
            sum,
            1e-10
          )
        );
    }

    const coefficients =
      new Float32Array(
        coefficientCount
      );

    for (
      let c = 0;
      c < coefficientCount;
      c++
    ) {
      let sum = 0;

      for (
        let m = 0;
        m < filterCount;
        m++
      ) {
        sum +=
          melEnergies[m] *
          Math.cos(
            Math.PI *
            c *
            (m + 0.5) /
            filterCount
          );
      }

      coefficients[c] =
        sum;
    }

    features.push(
      coefficients
    );
  }

  return normalizeSpeechFeatureSequence(
    features
  );
}


function normalizeSpeechFeatureSequence(
  sequence
) {
  if (
    !sequence.length
  ) {
    return sequence;
  }

  const dimensions =
    sequence[0].length;

  const mean =
    new Float64Array(
      dimensions
    );

  const deviation =
    new Float64Array(
      dimensions
    );

  for (
    const frame of sequence
  ) {
    for (
      let d = 0;
      d < dimensions;
      d++
    ) {
      mean[d] +=
        frame[d];
    }
  }

  for (
    let d = 0;
    d < dimensions;
    d++
  ) {
    mean[d] /=
      sequence.length;
  }

  for (
    const frame of sequence
  ) {
    for (
      let d = 0;
      d < dimensions;
      d++
    ) {
      const difference =
        frame[d] -
        mean[d];

      deviation[d] +=
        difference *
        difference;
    }
  }

  for (
    let d = 0;
    d < dimensions;
    d++
  ) {
    deviation[d] =
      Math.sqrt(
        deviation[d] /
        sequence.length
      ) || 1;
  }

  return sequence.map(
    frame => {
      const normalized =
        new Float32Array(
          dimensions
        );

      for (
        let d = 0;
        d < dimensions;
        d++
      ) {
        normalized[d] =
          (
            frame[d] -
            mean[d]
          ) /
          deviation[d];
      }

      return normalized;
    }
  );
}


function createSpeechMelFilterBank(
  sampleRate,
  fftSize,
  count
) {
  const hzToMel =
    hz =>
      2595 *
      Math.log10(
        1 + hz / 700
      );

  const melToHz =
    mel =>
      700 *
      (
        Math.pow(
          10,
          mel / 2595
        ) - 1
      );

  const lowMel =
    hzToMel(80);

  const highMel =
    hzToMel(
      Math.min(
        7600,
        sampleRate / 2
      )
    );

  const frequencies = [];

  for (
    let i = 0;
    i < count + 2;
    i++
  ) {
    frequencies.push(
      melToHz(
        lowMel +
        (
          highMel -
          lowMel
        ) *
        i /
        (count + 1)
      )
    );
  }

  const bins =
    frequencies.map(
      frequency =>
        Math.floor(
          (
            fftSize + 1
          ) *
          frequency /
          sampleRate
        )
    );

  const bank = [];

  for (
    let m = 1;
    m <= count;
    m++
  ) {
    const filter =
      new Float64Array(
        fftSize / 2 + 1
      );

    const left =
      bins[m - 1];

    const center =
      Math.max(
        left + 1,
        bins[m]
      );

    const right =
      Math.max(
        center + 1,
        bins[m + 1]
      );

    for (
      let k = left;
      k < center &&
      k < filter.length;
      k++
    ) {
      filter[k] =
        (
          k - left
        ) /
        (
          center - left
        );
    }

    for (
      let k = center;
      k <= right &&
      k < filter.length;
      k++
    ) {
      filter[k] =
        (
          right - k
        ) /
        (
          right - center
        );
    }

    bank.push(filter);
  }

  return bank;
}


function speechFFT(input) {
  const length =
    input.length;

  const real =
    new Float64Array(
      input
    );

  const imag =
    new Float64Array(
      length
    );

  for (
    let i = 1, j = 0;
    i < length;
    i++
  ) {
    let bit =
      length >> 1;

    for (
      ;
      j & bit;
      bit >>= 1
    ) {
      j ^= bit;
    }

    j ^= bit;

    if (
      i < j
    ) {
      const realTemp =
        real[i];

      real[i] =
        real[j];

      real[j] =
        realTemp;

      const imagTemp =
        imag[i];

      imag[i] =
        imag[j];

      imag[j] =
        imagTemp;
    }
  }

  for (
    let block = 2;
    block <= length;
    block <<= 1
  ) {
    const angle =
      -2 *
      Math.PI /
      block;

    for (
      let start = 0;
      start < length;
      start += block
    ) {
      for (
        let offset = 0;
        offset < block / 2;
        offset++
      ) {
        const wr =
          Math.cos(
            angle *
            offset
          );

        const wi =
          Math.sin(
            angle *
            offset
          );

        const aIndex =
          start +
          offset;

        const bIndex =
          aIndex +
          block / 2;

        const bReal =
          real[bIndex];

        const bImag =
          imag[bIndex];

        const vReal =
          bReal * wr -
          bImag * wi;

        const vImag =
          bReal * wi +
          bImag * wr;

        const aReal =
          real[aIndex];

        const aImag =
          imag[aIndex];

        real[aIndex] =
          aReal + vReal;

        imag[aIndex] =
          aImag + vImag;

        real[bIndex] =
          aReal - vReal;

        imag[bIndex] =
          aImag - vImag;
      }
    }
  }

  return {
    real,
    imag
  };
}


function speechFrameDistance(
  a,
  b
) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    dot +=
      a[i] *
      b[i];

    normA +=
      a[i] *
      a[i];

    normB +=
      b[i] *
      b[i];
  }

  return (
    1 -
    dot /
    (
      Math.sqrt(
        normA *
        normB
      ) +
      1e-9
    )
  );
}


function speechDTWDistance(
  A,
  B
) {
  const n = A.length;
  const m = B.length;

  const previous =
    new Float64Array(
      m + 1
    ).fill(Infinity);

  const current =
    new Float64Array(
      m + 1
    ).fill(Infinity);

  previous[0] = 0;

  for (
    let i = 1;
    i <= n;
    i++
  ) {
    current.fill(
      Infinity
    );

    const expected =
      Math.round(
        i * m / n
      );

    const radius =
      Math.max(
        20,
        Math.floor(
          m * 0.35
        )
      );

    const from =
      Math.max(
        1,
        expected - radius
      );

    const to =
      Math.min(
        m,
        expected + radius
      );

    for (
      let j = from;
      j <= to;
      j++
    ) {
      const cost =
        speechFrameDistance(
          A[i - 1],
          B[j - 1]
        );

      current[j] =
        cost +
        Math.min(
          previous[j],
          current[j - 1],
          previous[j - 1]
        );
    }

    previous.set(
      current
    );
  }

  return (
    previous[m] /
    (n + m)
  );
}


function finishSpeechChallenge() {
  stopSpeechRecognition();
  stopAudio();

  const status = document.getElementById("speechStatus");
  if (status) {
    status.textContent = "🎉 太厲害了！🐉 龍隊成功完成最後的挑戰！";
  }

  setTimeout(() => {
    showFinish();
  }, 1000);
}


/* =========================================
   洗牌
========================================= */

function shuffle(array) {

  const result = [...array];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(Math.random() * (i + 1));

    [
      result[i],
      result[j]
    ] = [
      result[j],
      result[i]
    ];

  }

  return result;
}
