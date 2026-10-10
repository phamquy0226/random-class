(function (global) {
  "use strict";

  const data = global.RandomClass.Data;
  const reelCount = 3;
  const animationRows = 24;
  const rowHeight = 72;
  let rosterSignature = "";
  let selectedStudents = new Set();
  let spinning = false;
  let spinCount = 0;
  let spinTimer = 0;
  let spinToken = 0;
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

  function renderHistory() {
    const allEntries = global.RandomClass.History.getAll()
      .filter((entry) => entry.game === "Máy xổ số Slot Machine");
    const entries = allEntries.slice(0, 10);
    const list = document.getElementById("slot-history-list");
    list.replaceChildren();
    document.getElementById("slot-history-count").textContent = `${allEntries.length} lượt`;
    if (!entries.length) {
      const empty = document.createElement("li");
      empty.className = "slot-history-empty";
      empty.textContent = "Kết quả máy xổ số sẽ xuất hiện tại đây.";
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

  function getAvailableStudents(students) {
    return document.getElementById("slot-no-repeat").checked
      ? students.filter((student) => !selectedStudents.has(student))
      : students;
  }

  function renderRoster(students) {
    const list = document.getElementById("slot-roster");
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

  function updateControls(students) {
    const available = getAvailableStudents(students);
    const spinButton = document.getElementById("slot-spin");
    spinButton.disabled = spinning || available.length === 0;
    spinButton.textContent = spinning
      ? "ĐANG QUAY..."
      : spinCount > 0
        ? "QUAY TIẾP"
        : "BẮT ĐẦU QUAY";
    document.getElementById("slot-reset").disabled = spinning || spinCount === 0;
    document.getElementById("slot-no-repeat").disabled = spinning;
    document.getElementById("slot-sound").disabled = spinning;
  }

  function updateStatus(students) {
    const available = getAvailableStudents(students);
    const status = document.getElementById("slot-game-status");
    const hint = document.getElementById("slot-hint");
    if (spinning) {
      status.textContent = "Đang quay...";
      hint.textContent = "Các dải đang giảm tốc để dừng đúng kết quả đã chọn.";
    } else if (!students.length) {
      status.textContent = "Sẵn sàng";
      hint.textContent = "Hãy thêm ít nhất một học sinh để bắt đầu.";
    } else if (!available.length) {
      status.textContent = "Đã hết lượt";
      hint.textContent = "Tất cả học sinh đã được chọn trong phiên. Nhấn Đặt lại để quay lại từ đầu.";
    } else {
      status.textContent = document.getElementById("slot-no-repeat").checked && spinCount > 0
        ? `Còn ${available.length} học sinh`
        : spinCount > 0
          ? `Đã quay ${spinCount} lượt`
          : "Sẵn sàng";
      hint.textContent = "Kết quả được chọn trước; cả ba dải sẽ dừng đúng tên học sinh đó.";
    }
  }

  function render() {
    try {
      const active = getGameData();
      const signature = JSON.stringify([active.id, active.students]);
      if (signature !== rosterSignature) {
        global.clearTimeout(spinTimer);
        spinTimer = 0;
        spinToken += 1;
        spinning = false;
        selectedStudents = new Set();
        spinCount = 0;
        rosterSignature = signature;
        resetReels();
        document.getElementById("slot-result").textContent = "Tên được chọn sẽ hiện ở đây";
      }
      document.getElementById("slot-active-list").textContent = active.name;
      document.getElementById("slot-student-count").textContent = `${active.students.length} học sinh`;
      renderRoster(active.students);
      updateControls(active.students);
      updateStatus(active.students);
      renderHistory();
    } catch (error) {
      global.clearTimeout(spinTimer);
      spinTimer = 0;
      spinToken += 1;
      spinning = false;
      selectedStudents = new Set();
      spinCount = 0;
      document.getElementById("slot-active-list").textContent = "Không khả dụng";
      document.getElementById("slot-student-count").textContent = "Dữ liệu lỗi";
      const roster = document.getElementById("slot-roster");
      roster.replaceChildren();
      const rosterMessage = document.createElement("li");
      rosterMessage.className = "roster-empty roster-error";
      rosterMessage.textContent = error.message;
      roster.append(rosterMessage);
      document.getElementById("slot-result").textContent = "Hãy kiểm tra danh sách học sinh";
      document.getElementById("slot-game-status").textContent = "Kiểm tra dữ liệu";
      document.getElementById("slot-hint").textContent = error.message;
      resetReels();
      updateControls([]);
      renderHistory();
      global.RandomClass.App.handleError(error);
    }
  }

  function resetReels() {
    document.querySelectorAll(".slot-reel-track").forEach((track) => {
      track.replaceChildren();
      track.style.transition = "none";
      track.style.transform = "translateY(0)";
    });
    document.getElementById("slot-reels").classList.remove("is-spinning");
  }

  function createReelSequence(students, winner) {
    const rows = Array.from({ length: animationRows - 1 }, () => (
      global.RandomClass.Random.chooseOne(students)
    ));
    rows.push(winner);
    return rows;
  }

  function prepareReel(track, students, winner, reelIndex) {
    track.replaceChildren();
    track.style.transition = "none";
    track.style.transform = "translateY(0)";
    track.style.setProperty("--reel-duration", `${2.5 + reelIndex * 0.55}s`);
    createReelSequence(students, winner).forEach((student, index) => {
      const row = document.createElement("div");
      row.className = "slot-reel-item";
      row.textContent = student;
      if (index === animationRows - 1) row.classList.add("slot-reel-winner");
      track.append(row);
    });
  }

  function playStopSound() {
    if (!document.getElementById("slot-sound").checked) return;
    const AudioContextConstructor = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextConstructor) {
      global.RandomClass.App.notify("Trình duyệt này không hỗ trợ âm thanh.", true);
      return;
    }
    try {
      audioContext = audioContext || new AudioContextConstructor();
      audioContext.resume().then(() => {
        const startAt = audioContext.currentTime + 0.02;
        [659.25, 783.99, 987.77].forEach((frequency, index) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const noteStart = startAt + index * 0.09;
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency, noteStart);
          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.05, noteStart + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.25);
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(noteStart);
          oscillator.stop(noteStart + 0.27);
        });
      }).catch((error) => global.RandomClass.App.handleError(error));
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function finishSpin(token, winner, listName) {
    if (!spinning || token !== spinToken) return;
    global.clearTimeout(spinTimer);
    spinTimer = 0;
    spinning = false;
    document.getElementById("slot-result").textContent = winner;
    document.getElementById("slot-reels").classList.remove("is-spinning");
    try {
      global.RandomClass.History.add({
        game: "Máy xổ số Slot Machine",
        listName,
        results: [winner],
      });
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
    render();
    playStopSound();
  }

  function spin() {
    if (spinning) return;
    let active;
    try {
      active = getGameData();
    } catch (error) {
      render();
      return;
    }
    const available = getAvailableStudents(active.students);
    if (!available.length) {
      global.RandomClass.App.notify(active.students.length
        ? "Đã chọn hết học sinh trong phiên. Hãy đặt lại để tiếp tục."
        : "Hãy thêm ít nhất một học sinh vào danh sách lớp trước khi quay.", true);
      return;
    }

    const winner = global.RandomClass.Random.chooseOne(available);
    if (winner === null) {
      global.RandomClass.App.notify("Không thể chọn kết quả từ danh sách hiện tại.", true);
      return;
    }
    if (document.getElementById("slot-no-repeat").checked) selectedStudents.add(winner);

    spinning = true;
    spinCount += 1;
    const token = ++spinToken;
    const tracks = [...document.querySelectorAll(".slot-reel-track")];
    tracks.forEach((track, index) => prepareReel(track, active.students, winner, index));
    document.getElementById("slot-result").textContent = "Đang quay...";
    document.getElementById("slot-reels").classList.add("is-spinning");
    updateControls(active.students);
    updateStatus(active.students);
    tracks.forEach((track) => { void track.offsetHeight; });

    global.requestAnimationFrame(() => {
      if (token !== spinToken || !spinning) return;
      tracks.forEach((track) => {
        track.style.transition = "";
        track.style.transform = `translateY(-${(animationRows - 1) * rowHeight}px)`;
      });
    });

    const duration = 2.5 + (reelCount - 1) * 0.55;
    spinTimer = global.setTimeout(() => finishSpin(token, winner, active.name), duration * 1000 + 150);
  }

  function reset() {
    if (spinning) return;
    selectedStudents = new Set();
    spinCount = 0;
    document.getElementById("slot-result").textContent = "Tên được chọn sẽ hiện ở đây";
    resetReels();
    render();
  }

  global.RandomClass.SlotMachine = { render, reset, spin };
})(window);
