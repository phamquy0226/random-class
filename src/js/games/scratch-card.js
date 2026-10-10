(function (global) {
  "use strict";

  const data = global.RandomClass.Data;
  const coverWidth = 900;
  const coverHeight = 500;
  const brushSize = 72;
  const revealThreshold = 0.42;
  let rosterSignature = "";
  let selectedStudents = new Set();
  let roundActive = false;
  let busy = false;
  let revealed = false;
  let ticket = null;
  let scratchPointer = null;
  let scratchPointerId = null;
  let actionCount = 0;
  let audioContext = null;

  function getGameData() {
    const active = data.getActiveList();
    if (!active || typeof active.id !== "string" || !active.id
      || typeof active.name !== "string" || !active.name.trim()
      || !Array.isArray(active.students)) {
      throw new Error("Danh sách lớp hiện tại không hợp lệ.");
    }

    const students = active.students.map((student) => {
      if (typeof student !== "string" || !student.trim()) {
        throw new Error("Danh sách có tên học sinh không hợp lệ. Hãy sửa hoặc xóa dữ liệu lỗi trước khi chơi.");
      }
      return student.trim();
    });
    if (new Set(students.map((student) => student.toLocaleLowerCase())).size !== students.length) {
      throw new Error("Danh sách có tên học sinh trùng nhau. Hãy sửa danh sách trước khi chơi.");
    }
    return { id: active.id, name: active.name.trim(), students };
  }

  function getAvailableStudents(students) {
    return document.getElementById("scratch-no-repeat").checked
      ? students.filter((student) => !selectedStudents.has(student))
      : students;
  }

  function drawCover() {
    const canvas = document.getElementById("scratch-cover");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Không thể khởi tạo Canvas cho thẻ cào.");

    const gradient = context.createLinearGradient(0, 0, coverWidth, coverHeight);
    gradient.addColorStop(0, "#c3c7d2");
    gradient.addColorStop(0.48, "#f4f5f8");
    gradient.addColorStop(1, "#a9adba");
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    context.fillStyle = gradient;
    context.fillRect(0, 0, coverWidth, coverHeight);

    context.save();
    context.beginPath();
    context.roundRect(18, 18, coverWidth - 36, coverHeight - 36, 34);
    context.clip();
    context.strokeStyle = "rgba(255,255,255,.38)";
    context.lineWidth = 3;
    for (let offset = -coverHeight; offset < coverWidth; offset += 34) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset + coverHeight, coverHeight);
      context.stroke();
    }
    context.restore();

    context.strokeStyle = "rgba(255,255,255,.85)";
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(20, 20, coverWidth - 40, coverHeight - 40, 32);
    context.stroke();
    context.fillStyle = "#5c6070";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "800 34px 'Be Vietnam Pro', sans-serif";
    context.fillText("CÀO Ở ĐÂY", coverWidth / 2, coverHeight / 2 - 10);
    context.fillStyle = "#777c8d";
    context.font = "600 19px 'Be Vietnam Pro', sans-serif";
    context.fillText("Kéo chuột hoặc ngón tay để khám phá", coverWidth / 2, coverHeight / 2 + 36);
    context.globalCompositeOperation = "destination-out";
  }

  function renderRoster(students) {
    const list = document.getElementById("scratch-roster");
    list.replaceChildren();
    if (!students.length) {
      const empty = document.createElement("li");
      empty.className = "roster-empty";
      empty.textContent = "Danh sách đang trống. Nhập tên ở phía trên để bắt đầu.";
      list.append(empty);
      return;
    }

    students.forEach((student, index) => {
      const item = document.createElement("li");
      const number = document.createElement("span");
      number.className = "roster-number";
      number.textContent = String(index + 1);
      const name = document.createElement("span");
      name.textContent = student;
      item.append(number, name);
      list.append(item);
    });
  }

  function renderHistory() {
    const allEntries = global.RandomClass.History.getAll()
      .filter((entry) => entry.game === "Thẻ cào");
    const list = document.getElementById("scratch-history-list");
    list.replaceChildren();
    document.getElementById("scratch-history-count").textContent = `${allEntries.length} lượt`;
    const entries = allEntries.slice(0, 10);
    if (!entries.length) {
      const empty = document.createElement("li");
      empty.className = "scratch-history-empty";
      empty.textContent = "Kết quả thẻ cào sẽ xuất hiện tại đây.";
      list.append(empty);
      return;
    }

    entries.forEach((entry, index) => {
      const item = document.createElement("li");
      const number = document.createElement("span");
      number.className = "slot-history-number";
      number.textContent = String(index + 1);
      const result = document.createElement("span");
      result.className = "slot-history-result";
      result.textContent = entry.results.join(", ");
      const time = document.createElement("time");
      const date = new Date(entry.createdAt);
      time.dateTime = entry.createdAt || "";
      time.textContent = Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      item.append(number, result, time);
      list.append(item);
    });
  }

  function updateControls(students) {
    const available = getAvailableStudents(students);
    document.getElementById("scratch-start").disabled = busy || students.length === 0;
    document.getElementById("scratch-start").textContent = roundActive ? "CHƠI LẠI" : "BẮT ĐẦU";
    document.getElementById("scratch-next").disabled = busy || !roundActive || !revealed || available.length === 0;
    document.getElementById("scratch-reveal").disabled = busy || !roundActive || !ticket || revealed;
    document.getElementById("scratch-reset").disabled = busy || !roundActive;
    document.getElementById("scratch-no-repeat").disabled = busy || roundActive;
    document.getElementById("scratch-sound").disabled = busy;
    document.querySelectorAll("#scratch-add-students-form textarea, #scratch-add-students-form button")
      .forEach((control) => { control.disabled = busy; });
    document.getElementById("scratch-ticket").setAttribute("aria-busy", String(busy));
    document.getElementById("scratch-ticket").classList.toggle("is-covered", Boolean(ticket) && !revealed);
    document.getElementById("scratch-name").setAttribute("aria-hidden", String(!revealed));
  }

  function updateStatus(students) {
    const available = getAvailableStudents(students);
    const status = document.getElementById("scratch-game-status");
    const hint = document.getElementById("scratch-hint");
    if (busy) {
      status.textContent = "Đang mở thẻ...";
      hint.textContent = "Thẻ đang được mở. Kết quả đã được xác định trước khi cào.";
    } else if (!students.length) {
      status.textContent = "Sẵn sàng";
      hint.textContent = "Hãy thêm học sinh để bắt đầu.";
    } else if (!roundActive) {
      status.textContent = "Sẵn sàng";
      hint.textContent = "Bắt đầu để nhận thẻ cào bí mật.";
    } else if (!ticket) {
      status.textContent = "Đã hết lượt";
      hint.textContent = "Đã chọn hết học sinh trong phiên. Nhấn Chơi lại hoặc Đặt lại.";
    } else if (revealed) {
      status.textContent = available.length ? `${actionCount} lượt đã mở` : "Đã hết lượt";
      hint.textContent = available.length
        ? "Thẻ đã được mở. Chọn Thẻ tiếp theo để nhận kết quả kế tiếp."
        : "Đã hết học sinh trong phiên. Nhấn Chơi lại để bắt đầu vòng mới.";
    } else {
      status.textContent = actionCount ? `${actionCount} lượt đã mở` : "Thẻ đã sẵn sàng";
      hint.textContent = "Cào lớp phủ để khám phá tên học sinh đã được chọn trước.";
    }
  }

  function render() {
    try {
      const active = getGameData();
      const signature = JSON.stringify([active.id, active.students]);
      if (signature !== rosterSignature) {
        selectedStudents = new Set();
        roundActive = false;
        busy = false;
        revealed = false;
        ticket = null;
        scratchPointer = null;
        scratchPointerId = null;
        actionCount = 0;
        rosterSignature = signature;
        document.getElementById("scratch-name").textContent = "?";
        document.getElementById("scratch-caption").textContent = "Bắt đầu rồi cào lớp phủ";
        drawCover();
      }
      document.getElementById("scratch-active-list").textContent = active.name;
      document.getElementById("scratch-student-count").textContent = `${active.students.length} học sinh`;
      renderRoster(active.students);
      updateControls(active.students);
      updateStatus(active.students);
      renderHistory();
    } catch (error) {
      selectedStudents = new Set();
      roundActive = false;
      busy = false;
      revealed = false;
      ticket = null;
      scratchPointer = null;
      scratchPointerId = null;
      actionCount = 0;
      document.getElementById("scratch-active-list").textContent = "Không khả dụng";
      document.getElementById("scratch-student-count").textContent = "Dữ liệu lỗi";
      const roster = document.getElementById("scratch-roster");
      roster.replaceChildren();
      const message = document.createElement("li");
      message.className = "roster-empty roster-error";
      message.textContent = error.message;
      roster.append(message);
      document.getElementById("scratch-name").textContent = "?";
      document.getElementById("scratch-caption").textContent = "Hãy kiểm tra danh sách";
      document.getElementById("scratch-game-status").textContent = "Kiểm tra dữ liệu";
      document.getElementById("scratch-hint").textContent = error.message;
      drawCover();
      updateControls([]);
      renderHistory();
      global.RandomClass.App.handleError(error);
    }
  }

  function renderTicket(student) {
    ticket = { student };
    revealed = false;
    const card = document.getElementById("scratch-ticket");
    card.classList.remove("is-revealed");
    document.getElementById("scratch-name").textContent = student;
    document.getElementById("scratch-caption").textContent = "Cào lớp phủ để lộ tên";
    drawCover();
    updateControls(data.getActiveList().students);
  }

  function prepareNextTicket() {
    if (busy || !roundActive) return;
    let active;
    try {
      active = getGameData();
    } catch (error) {
      render();
      return;
    }
    const available = getAvailableStudents(active.students);
    const student = global.RandomClass.Random.chooseOne(available);
    if (student === null) {
      ticket = null;
      revealed = false;
      document.getElementById("scratch-name").textContent = "?";
      document.getElementById("scratch-caption").textContent = "Đã hết lượt";
      document.getElementById("scratch-ticket").classList.remove("is-revealed");
      drawCover();
      render();
      return;
    }
    if (document.getElementById("scratch-no-repeat").checked) selectedStudents.add(student);
    renderTicket(student);
    render();
  }

  function start() {
    let active;
    try {
      active = getGameData();
    } catch (error) {
      render();
      return;
    }
    if (!active.students.length) {
      global.RandomClass.App.notify("Hãy thêm ít nhất một học sinh vào danh sách lớp trước khi bắt đầu.", true);
      return;
    }

    selectedStudents = new Set();
    roundActive = true;
    busy = false;
    actionCount = 0;
    prepareNextTicket();
  }

  function getScratchPosition(event, canvas) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * canvas.height / bounds.height,
    };
  }

  function scratchAt(event) {
    if (!ticket || revealed || busy || scratchPointerId !== event.pointerId || scratchPointer === null) return;
    const canvas = document.getElementById("scratch-cover");
    const context = canvas.getContext("2d");
    if (!context) {
      global.RandomClass.App.handleError(new Error("Không thể vẽ lên lớp phủ thẻ cào."));
      return;
    }
    const position = getScratchPosition(event, canvas);
    context.globalCompositeOperation = "destination-out";
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(scratchPointer.x, scratchPointer.y);
    context.lineTo(position.x, position.y);
    context.stroke();
    context.beginPath();
    context.arc(position.x, position.y, brushSize / 2, 0, Math.PI * 2);
    context.fill();
    scratchPointer = position;
  }

  function getClearedRatio() {
    const canvas = document.getElementById("scratch-cover");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Không thể kiểm tra lớp phủ thẻ cào.");
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const sampleStep = 12;
    let sampled = 0;
    let cleared = 0;
    for (let y = 0; y < canvas.height; y += sampleStep) {
      for (let x = 0; x < canvas.width; x += sampleStep) {
        const alpha = pixels[(y * canvas.width + x) * 4 + 3];
        sampled += 1;
        if (alpha < 32) cleared += 1;
      }
    }
    return cleared / sampled;
  }

  function playRevealSound() {
    if (!document.getElementById("scratch-sound").checked) return;
    const AudioContextConstructor = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextConstructor) {
      global.RandomClass.App.notify("Trình duyệt này không hỗ trợ âm thanh.", true);
      return;
    }
    try {
      audioContext = audioContext || new AudioContextConstructor();
      audioContext.resume().catch((error) => global.RandomClass.App.handleError(error));
      const startAt = audioContext.currentTime + 0.02;
      [587.33, 739.99, 880].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const noteStart = startAt + index * 0.1;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.05, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.28);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.3);
      });
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function finishReveal() {
    if (!ticket || revealed || busy) return;
    busy = true;
    updateControls(data.getActiveList().students);
    const canvas = document.getElementById("scratch-cover");
    const context = canvas.getContext("2d");
    if (!context) {
      busy = false;
      global.RandomClass.App.handleError(new Error("Không thể mở lớp phủ thẻ cào."));
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    const winner = ticket.student;
    revealed = true;
    busy = false;
    actionCount += 1;
    document.getElementById("scratch-ticket").classList.add("is-revealed");
    document.getElementById("scratch-caption").textContent = "Chúc mừng học sinh may mắn!";
    updateControls(data.getActiveList().students);
    updateStatus(data.getActiveList().students);
    try {
      const active = getGameData();
      global.RandomClass.History.add({
        game: "Thẻ cào",
        listName: active.name,
        results: [winner],
      });
      global.RandomClass.App.renderHistory();
      renderHistory();
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
    playRevealSound();

    document.getElementById("scratch-caption").textContent = "Đã cào xong!";
  }

  function reveal() {
    if (!ticket || revealed || busy) return;
    finishReveal();
  }

  function handlePointerDown(event) {
    if (!ticket || revealed || busy || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    const canvas = event.currentTarget;
    scratchPointer = getScratchPosition(event, canvas);
    scratchPointerId = event.pointerId;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
    const context = canvas.getContext("2d");
    if (!context) {
      scratchPointer = null;
      scratchPointerId = null;
      global.RandomClass.App.handleError(new Error("Không thể vẽ lên lớp phủ thẻ cào."));
      return;
    }
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(scratchPointer.x, scratchPointer.y, brushSize / 2, 0, Math.PI * 2);
    context.fill();
  }

  function handlePointerUp(event) {
    if (scratchPointer === null || event.pointerId !== scratchPointerId) return;
    scratchPointer = null;
    scratchPointerId = null;
    if (!ticket || revealed || busy) return;
    try {
      if (getClearedRatio() >= revealThreshold) finishReveal();
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function reset() {
    if (busy) return;
    selectedStudents = new Set();
    roundActive = false;
    revealed = false;
    ticket = null;
    scratchPointer = null;
    scratchPointerId = null;
    actionCount = 0;
    document.getElementById("scratch-name").textContent = "?";
    document.getElementById("scratch-caption").textContent = "Bắt đầu rồi cào lớp phủ";
    document.getElementById("scratch-ticket").classList.remove("is-revealed");
    drawCover();
    render();
  }

  const canvas = document.getElementById("scratch-cover");
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", scratchAt);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("lostpointercapture", handlePointerUp);
  drawCover();

  global.RandomClass.ScratchCard = { next: prepareNextTicket, render, reset, reveal, start };
})(window);
