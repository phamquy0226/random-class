(function (global) {
  "use strict";

  const data = global.RandomClass.Data;
  let rosterSignature = "";
  let boxes = [];
  let roundActive = false;
  let roundSize = 0;
  let openingBox = null;
  let openingTimer = 0;
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

  function createGiftIcon() {
    const icon = document.createElement("span");
    icon.className = "gift-card-icon";
    icon.setAttribute("aria-hidden", "true");
    const body = document.createElement("span");
    body.className = "gift-card-box";
    const bow = document.createElement("span");
    bow.className = "gift-card-bow";
    icon.append(body, bow);
    return icon;
  }

  function createGiftButton(box, decorativeCopy) {
    const button = document.createElement("button");
    button.className = "gift-card";
    button.type = "button";
    button.disabled = box.opened || openingBox !== null;
    const position = `hàng ${(box.number - 1) % 2 + 1}, vị trí ${Math.floor((box.number - 1) / 2) + 1}`;
    button.setAttribute("aria-label", box.opened
      ? `Hộp quà ở ${position} đã mở. Bên trong có ${box.student}.`
      : `Mở hộp quà ở ${position}`);
    if (decorativeCopy) {
      button.setAttribute("aria-hidden", "true");
      button.tabIndex = -1;
    }
    if (box === openingBox) button.classList.add("opening");
    button.append(createGiftIcon());
    button.addEventListener("click", () => openBox(box));
    return button;
  }

  function renderGrid(students) {
    const grid = document.getElementById("gift-grid");
    grid.replaceChildren();
    if (!boxes.length) {
      const empty = document.createElement("p");
      empty.className = "gift-grid-empty";
      empty.textContent = roundActive
        ? "Đã mở hết hộp quà. Chọn Chơi lại để tạo lượt mới."
        : students.length
          ? "Nhấn Bắt đầu để xếp học sinh ngẫu nhiên vào các hộp quà."
          : "Chưa có hộp quà. Hãy nhập danh sách học sinh ở phía trên để bắt đầu.";
      grid.append(empty);
      return;
    }

    for (let laneIndex = 0; laneIndex < 2; laneIndex += 1) {
      const laneBoxes = boxes.filter((box, index) => index % 2 === laneIndex);
      if (!laneBoxes.length) continue;

      const lane = document.createElement("div");
      lane.className = "gift-lane";
      lane.setAttribute("aria-label", `Băng chuyền hàng ${laneIndex + 1}`);
      const track = document.createElement("div");
      track.className = "gift-track";
      track.style.setProperty("--conveyor-duration", `${Math.max(12, laneBoxes.length * 1.6)}s`);

      [false, true].forEach((decorativeCopy) => {
        const group = document.createElement("div");
        group.className = "gift-group";
        if (decorativeCopy) group.setAttribute("aria-hidden", "true");
        laneBoxes.forEach((box) => group.append(createGiftButton(box, decorativeCopy)));
        track.append(group);
      });

      lane.append(track);
      grid.append(lane);
    }
  }

  function renderRoster(students) {
    const list = document.getElementById("box-roster");
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
    const hasRound = roundActive;
    const startButton = document.getElementById("box-start");
    const resetButton = document.getElementById("box-reset");
    const noRepeat = document.getElementById("box-no-repeat");
    const sound = document.getElementById("box-sound");
    const addStudentsForm = document.getElementById("box-add-students-form");
    startButton.disabled = studentCount === 0 || openingBox !== null;
    startButton.textContent = hasRound ? "CHƠI LẠI" : "BẮT ĐẦU";
    resetButton.disabled = !hasRound || openingBox !== null;
    noRepeat.disabled = hasRound || openingBox !== null;
    sound.disabled = openingBox !== null;
    addStudentsForm.querySelectorAll("textarea, button").forEach((control) => {
      control.disabled = openingBox !== null;
    });
  }

  function render() {
    const hint = document.getElementById("box-hint");
    const status = document.getElementById("box-game-status");
    try {
      const active = getGameData();
      const signature = JSON.stringify([active.id, active.students]);
      if (signature !== rosterSignature) {
        global.clearTimeout(openingTimer);
        openingTimer = 0;
        openingBox = null;
        boxes = [];
        roundActive = false;
        roundSize = 0;
        rosterSignature = signature;
      }
      document.getElementById("box-active-list").textContent = active.name;
      document.getElementById("box-student-count").textContent = `${active.students.length} học sinh`;
      renderRoster(active.students);
      renderGrid(active.students);
      updateControls(active.students.length);
      if (openingBox) {
        status.textContent = "Đang mở hộp...";
        hint.textContent = "Hộp quà đang được mở. Kết quả đã được xác định từ trước.";
      } else if (!roundActive) {
        status.textContent = "Sẵn sàng";
        hint.textContent = active.students.length
          ? "Bắt đầu để tạo hộp quà; sau đó chọn và mở từng hộp."
          : "Nhập danh sách học sinh ở phía trên để bắt đầu.";
      } else {
        const openedCount = roundSize - boxes.length;
        status.textContent = boxes.length === 0 ? "Đã mở hết" : `${openedCount}/${roundSize} hộp đã mở`;
        hint.textContent = boxes.length === 0
          ? "Đã mở hết hộp quà. Chọn Chơi lại để xếp một lượt mới."
          : `Đã mở ${openedCount} trên ${roundSize} hộp. Các hộp quà đang tự chạy trên băng chuyền.`;
      }
    } catch (error) {
      global.clearTimeout(openingTimer);
      openingTimer = 0;
      openingBox = null;
      boxes = [];
      roundActive = false;
      roundSize = 0;
      document.getElementById("box-active-list").textContent = "Không khả dụng";
      document.getElementById("box-student-count").textContent = "Dữ liệu lỗi";
      const roster = document.getElementById("box-roster");
      roster.replaceChildren();
      const message = document.createElement("li");
      message.className = "roster-empty roster-error";
      message.textContent = error.message;
      roster.append(message);
      renderGrid([]);
      updateControls(0);
      status.textContent = "Kiểm tra dữ liệu";
      hint.textContent = error.message;
      global.RandomClass.App.handleError(error);
    }
  }

  function start() {
    if (openingBox) return;
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

    const noRepeat = document.getElementById("box-no-repeat").checked;
    const assignments = noRepeat
      ? global.RandomClass.Random.shuffle(active.students)
      : Array.from({ length: active.students.length }, () => global.RandomClass.Random.chooseOne(active.students));
    boxes = assignments.map((student, index) => ({ number: index + 1, student, opened: false }));
    roundActive = true;
    roundSize = boxes.length;
    rosterSignature = JSON.stringify([active.id, active.students]);
    render();
  }

  function playOpenSound() {
    if (!document.getElementById("box-sound").checked) return;
    const AudioContextConstructor = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextConstructor) {
      global.RandomClass.App.notify("Trình duyệt này không hỗ trợ âm thanh.", true);
      return;
    }

    try {
      audioContext = audioContext || new AudioContextConstructor();
      audioContext.resume().then(() => {
        const startAt = audioContext.currentTime + 0.02;
        [587.33, 739.99, 880].forEach((frequency, index) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency, startAt + index * 0.08);
          gain.gain.setValueAtTime(0.0001, startAt + index * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.07, startAt + index * 0.08 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, startAt + index * 0.08 + 0.24);
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(startAt + index * 0.08);
          oscillator.stop(startAt + index * 0.08 + 0.26);
        });
      }).catch((error) => global.RandomClass.App.handleError(error));
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function openBox(box) {
    if (openingBox || box.opened || !boxes.includes(box)) return;
    openingBox = box;
    render();
    openingTimer = global.setTimeout(() => {
      if (openingBox !== box || !boxes.includes(box)) return;
      openingTimer = 0;
      openingBox = null;
      boxes = boxes.filter((candidate) => candidate !== box);
      render();
      playOpenSound();
      try {
        global.RandomClass.History.add({
          game: "Hộp quà bí ẩn",
          listName: document.getElementById("box-active-list").textContent,
          results: [box.student],
        });
        global.RandomClass.App.renderHistory();
      } catch (error) {
        global.RandomClass.App.handleError(error);
      }
      const hasMoreBoxes = boxes.length > 0;
      global.RandomClass.App.showResult(box.student, {
        kicker: "HỘP QUÀ ĐÃ MỞ",
        subtitle: "Chúc mừng bạn được chọn từ hộp quà bí ẩn!",
        actionLabel: hasMoreBoxes ? "Tiếp tục" : "Chơi lại",
        focusTarget: hasMoreBoxes ? "#gift-grid" : "#box-start",
        onAgain: hasMoreBoxes
          ? () => document.getElementById("gift-grid").focus()
          : start,
      });
    }, 600);
  }

  function reset() {
    if (openingBox) return;
    boxes = [];
    roundActive = false;
    roundSize = 0;
    render();
    document.getElementById("box-game-status").textContent = "Sẵn sàng";
    document.getElementById("box-hint").textContent = "Lượt chơi đã được đặt lại. Nhấn Bắt đầu để tạo hộp quà mới.";
  }

  global.RandomClass.MysteryBox = { render, reset, start };
})(window);
