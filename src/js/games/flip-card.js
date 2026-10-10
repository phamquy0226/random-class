(function (global) {
  "use strict";

  const data = global.RandomClass.Data;
  let rosterSignature = "";
  let cards = [];
  let roundActive = false;
  let roundSize = 0;
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

  function renderCards(students) {
    const grid = document.getElementById("flip-card-grid");
    grid.replaceChildren();
    if (!cards.length) {
      const empty = document.createElement("li");
      empty.className = "flip-card-empty";
      empty.textContent = students.length
        ? "Nhấn Bắt đầu để tạo bộ thẻ và phân tên ngẫu nhiên."
        : "Chưa có thẻ. Hãy thêm học sinh trong mục Danh sách lớp.";
      grid.append(empty);
      return;
    }

    cards.forEach((card) => {
      const item = document.createElement("li");
      item.className = "flip-card-item";
      const button = document.createElement("button");
      button.className = `flip-card${card.flipped ? " is-flipped" : ""}`;
      button.type = "button";
      button.dataset.cardNumber = String(card.number);
      button.setAttribute("aria-pressed", String(card.flipped));
      button.setAttribute("aria-label", card.flipped
        ? `Đã lật: ${card.student}.`
        : "Lật thẻ");

      const inner = document.createElement("span");
      inner.className = "flip-card-inner";
      const back = document.createElement("span");
      back.className = "flip-card-face flip-card-back";
      back.setAttribute("aria-hidden", "true");
      const backMark = document.createElement("span");
      backMark.className = "flip-card-back-mark";
      backMark.textContent = "?";
      back.append(backMark);
      const front = document.createElement("span");
      front.className = "flip-card-face flip-card-front";
      const studentName = document.createElement("span");
      studentName.className = "flip-card-name";
      studentName.textContent = card.student;
      front.append(studentName);
      inner.append(back, front);
      button.append(inner);
      button.addEventListener("click", () => reveal(card));
      item.append(button);
      grid.append(item);
    });
  }

  function renderRoster(students) {
    const list = document.getElementById("flip-roster");
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

  function updateControls(studentCount) {
    const flippedCount = cards.filter((card) => card.flipped).length;
    document.getElementById("flip-start").disabled = studentCount === 0;
    document.getElementById("flip-start").textContent = roundActive ? "CHƠI LẠI" : "BẮT ĐẦU";
    document.getElementById("flip-random").disabled = !roundActive || flippedCount === cards.length;
    document.getElementById("flip-back").disabled = !roundActive || flippedCount === 0;
    document.getElementById("flip-reset").disabled = !roundActive;
    document.getElementById("flip-no-repeat").disabled = roundActive;
  }

  function updateStatus(studentCount) {
    const flippedCount = cards.filter((card) => card.flipped).length;
    document.getElementById("flip-game-status").textContent = roundActive
      ? `${flippedCount}/${roundSize} thẻ đã lật`
      : "Sẵn sàng";
    document.getElementById("flip-hint").textContent = roundActive
      ? "Tên đã được gán sẵn. Chọn một thẻ hoặc để trò chơi chọn ngẫu nhiên."
      : studentCount
        ? "Bắt đầu để xáo trộn tên vào các thẻ."
        : "Hãy thêm ít nhất một học sinh để bắt đầu.";
  }

  function render() {
    const status = document.getElementById("flip-game-status");
    const hint = document.getElementById("flip-hint");
    try {
      const active = getGameData();
      const signature = JSON.stringify([active.id, active.students]);
      if (signature !== rosterSignature) {
        cards = [];
        roundActive = false;
        roundSize = 0;
        rosterSignature = signature;
      }
      document.getElementById("flip-active-list").textContent = active.name;
      document.getElementById("flip-student-count").textContent = `${active.students.length} học sinh`;
      renderRoster(active.students);
      renderCards(active.students);
      updateControls(active.students.length);
      updateStatus(active.students.length);
    } catch (error) {
      cards = [];
      roundActive = false;
      roundSize = 0;
      document.getElementById("flip-active-list").textContent = "Không khả dụng";
      document.getElementById("flip-student-count").textContent = "Dữ liệu lỗi";
      const roster = document.getElementById("flip-roster");
      roster.replaceChildren();
      const rosterMessage = document.createElement("li");
      rosterMessage.className = "roster-empty roster-error";
      rosterMessage.textContent = error.message;
      roster.append(rosterMessage);
      const grid = document.getElementById("flip-card-grid");
      grid.replaceChildren();
      const message = document.createElement("li");
      message.className = "flip-card-empty roster-error";
      message.textContent = error.message;
      grid.append(message);
      updateControls(0);
      status.textContent = "Kiểm tra dữ liệu";
      hint.textContent = "Không thể bắt đầu cho đến khi dữ liệu được sửa.";
      global.RandomClass.App.handleError(error);
    }
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

    const noRepeat = document.getElementById("flip-no-repeat").checked;
    const assignments = noRepeat
      ? global.RandomClass.Random.shuffle(active.students)
      : Array.from({ length: active.students.length }, () => global.RandomClass.Random.chooseOne(active.students));
    cards = assignments.map((student, index) => ({
      number: index + 1,
      student,
      flipped: false,
    }));
    roundActive = true;
    roundSize = cards.length;
    rosterSignature = JSON.stringify([active.id, active.students]);
    render();
  }

  function playFlipSound() {
    if (!document.getElementById("flip-sound").checked) return;
    const AudioContextConstructor = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextConstructor) {
      global.RandomClass.App.notify("Trình duyệt này không hỗ trợ âm thanh.", true);
      return;
    }
    try {
      audioContext = audioContext || new AudioContextConstructor();
      audioContext.resume().then(() => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startAt = audioContext.currentTime + 0.02;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(660, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.045, startAt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.18);
      }).catch((error) => global.RandomClass.App.handleError(error));
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function reveal(card) {
    if (!roundActive || card.flipped || !cards.includes(card)) return;
    const button = document.querySelector(`#flip-card-grid [data-card-number="${card.number}"]`);
    if (!button) {
      render();
      return;
    }
    card.flipped = true;
    button.classList.add("is-flipped");
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", `Đã lật: ${card.student}.`);
    updateControls(cards.length);
    updateStatus(cards.length);
    playFlipSound();
    try {
      const active = getGameData();
      global.RandomClass.History.add({
        game: "Thẻ lật 3D",
        listName: active.name,
        results: [card.student],
      });
      global.RandomClass.App.renderHistory();
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function flipRandom() {
    const faceDown = cards.filter((card) => !card.flipped);
    if (!roundActive || !faceDown.length) return;
    const card = global.RandomClass.Random.chooseOne(faceDown);
    if (card) reveal(card);
  }

  function flipBack() {
    if (!roundActive) return;
    cards.forEach((card) => {
      card.flipped = false;
      const button = document.querySelector(`#flip-card-grid [data-card-number="${card.number}"]`);
      if (!button) return;
      button.classList.remove("is-flipped");
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "Lật thẻ");
    });
    updateControls(cards.length);
    updateStatus(cards.length);
  }

  function reset() {
    cards = [];
    roundActive = false;
    roundSize = 0;
    render();
    document.getElementById("flip-game-status").textContent = "Sẵn sàng";
    document.getElementById("flip-hint").textContent = "Bộ thẻ đã được đặt lại. Nhấn Bắt đầu để tạo lượt mới.";
  }

  global.RandomClass.FlipCard = { flipBack, flipRandom, render, reset, start };
})(window);
