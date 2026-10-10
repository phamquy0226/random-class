(function (global) {
  "use strict";

  const svgNamespace = "http://www.w3.org/2000/svg";
  const colors = ["#8c6af2", "#ffbf69", "#54c6a1", "#f27c95", "#54a8df", "#f18e67", "#a981d9", "#ed8eae"];
  let spinning = false;
  let spinSession = global.RandomClass.Random.createSession();
  let rosterSignature = "";
  let finishTimer = 0;
  let audioContext = null;

  function getWheelData() {
    const activeList = global.RandomClass.Data.getActiveList();
    if (!activeList || typeof activeList.id !== "string" || !activeList.id
      || typeof activeList.name !== "string" || !activeList.name.trim()
      || !Array.isArray(activeList.students)) {
      throw new Error("Danh sách lớp hiện tại không hợp lệ.");
    }

    const students = activeList.students.map((student) => {
      if (typeof student !== "string" || !student.trim()) {
        throw new Error("Danh sách có tên học sinh không hợp lệ. Hãy sửa hoặc xóa dữ liệu lỗi trước khi quay.");
      }
      return student.trim();
    });
    const normalizedNames = students.map((student) => student.toLocaleLowerCase());
    if (new Set(normalizedNames).size !== students.length) {
      throw new Error("Danh sách có tên học sinh trùng nhau. Hãy sửa danh sách trước khi quay.");
    }
    return { id: activeList.id, name: activeList.name, students };
  }

  function createSvgElement(name, attributes) {
    const element = document.createElementNS(svgNamespace, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function drawWheel(students) {
    const disc = document.getElementById("wheel-disc");
    const svg = document.getElementById("wheel-svg");
    svg.replaceChildren();
    if (!students.length) {
      svg.setAttribute("aria-label", "Vòng quay trống");
      disc.classList.add("wheel-empty");
      return;
    }

    disc.classList.remove("wheel-empty");
    svg.setAttribute("aria-label", `Vòng quay gồm ${students.length} phần tương ứng với danh sách học sinh.`);
    const group = createSvgElement("g", {});
    const sliceAngle = (Math.PI * 2) / students.length;
    const radius = 190;
    const labelRadius = students.length > 8 ? 136 : 126;

    students.forEach((student, index) => {
      const middleAngle = -Math.PI / 2 + (index + 0.5) * sliceAngle;
      let sector;
      if (students.length === 1) {
        sector = createSvgElement("circle", { cx: 200, cy: 200, r: radius, fill: colors[index % colors.length], stroke: "#fff", "stroke-width": 2 });
      } else {
        const startAngle = -Math.PI / 2 + index * sliceAngle;
        const endAngle = startAngle + sliceAngle;
        const start = { x: 200 + radius * Math.cos(startAngle), y: 200 + radius * Math.sin(startAngle) };
        const end = { x: 200 + radius * Math.cos(endAngle), y: 200 + radius * Math.sin(endAngle) };
        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        sector = createSvgElement("path", {
          d: `M 200 200 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`,
          fill: colors[index % colors.length],
          stroke: "#fff",
          "stroke-width": 2,
        });
      }
      group.append(sector);
      {
        const x = students.length === 1 ? 200 : 200 + labelRadius * Math.cos(middleAngle);
        const y = students.length === 1 ? 72 : 200 + labelRadius * Math.sin(middleAngle);
        const radialLabels = students.length > 8;
        let labelAngle = radialLabels ? middleAngle * 180 / Math.PI : index * 360 / students.length;
        if (labelAngle > 90 || labelAngle < -90) labelAngle += 180;
        labelAngle = ((labelAngle + 180) % 360) - 180;
        const fontSize = radialLabels
          ? Math.max(6, Math.min(14, 420 / students.length))
          : Math.max(8, Math.min(15, 180 / students.length));
        const text = createSvgElement("text", {
          x,
          y,
          fill: "#fff",
          "font-size": fontSize,
          "font-weight": 700,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          transform: `rotate(${labelAngle} ${x} ${y})`,
          "paint-order": "stroke",
          stroke: "#27213b80",
          "stroke-width": 2,
          "stroke-linejoin": "round",
          textLength: Math.min(student.length * fontSize * 0.58, 108),
          lengthAdjust: "spacingAndGlyphs",
        });
        text.textContent = student;
        group.append(text);
      }
    });
    svg.append(group);
  }

  function resetRotation() {
    const disc = document.getElementById("wheel-disc");
    disc.style.transition = "none";
    disc.style.transform = "rotate(0deg)";
    disc.dataset.rotation = "0";
    disc.getBoundingClientRect();
    disc.style.removeProperty("transition");
  }

  function updateControls(studentCount) {
    const spinButton = document.getElementById("spin-button");
    const resetButton = document.getElementById("wheel-reset");
    const noRepeatToggle = document.getElementById("no-repeat-toggle");
    const soundToggle = document.getElementById("wheel-sound-toggle");
    const durationSelect = document.getElementById("wheel-duration");
    spinButton.disabled = spinning || studentCount === 0;
    spinButton.textContent = spinning ? "ĐANG QUAY..." : "BẮT ĐẦU QUAY";
    resetButton.disabled = spinning || studentCount === 0;
    noRepeatToggle.disabled = spinning;
    soundToggle.disabled = spinning;
    durationSelect.disabled = spinning;
  }

  function renderRoster() {
    const list = document.getElementById("wheel-roster");
    const hint = document.getElementById("wheel-hint");
    const status = document.getElementById("wheel-game-status");
    list.replaceChildren();

    try {
      const active = getWheelData();
      const signature = JSON.stringify([active.id, active.students]);
      if (signature !== rosterSignature && !spinning) {
        spinSession.reset();
        resetRotation();
        rosterSignature = signature;
      }

      document.getElementById("wheel-active-list").textContent = active.name;
      document.getElementById("wheel-student-count").textContent = `${active.students.length} học sinh`;
      active.students.forEach((student, index) => {
        const item = document.createElement("li");
        const number = document.createElement("span");
        number.className = "roster-number";
        number.textContent = String(index + 1);
        const name = document.createElement("span");
        name.textContent = student;
        item.append(number, name);
        list.append(item);
      });
      if (!active.students.length) {
        const empty = document.createElement("li");
        empty.className = "roster-empty";
        empty.textContent = "Danh sách đang trống. Thêm tên trong mục Danh sách lớp hoặc ngay tại đây để bắt đầu.";
        list.append(empty);
      }
      if (!spinning) drawWheel(active.students);
      updateControls(active.students.length);
      status.textContent = spinning ? "Đang quay..." : "Sẵn sàng";
      if (!spinning) hint.textContent = active.students.length
        ? "Kết quả được chọn trước khi vòng xoay bắt đầu."
        : "Hãy thêm ít nhất một học sinh để bắt đầu.";
    } catch (error) {
      drawWheel([]);
      document.getElementById("wheel-active-list").textContent = "Không khả dụng";
      document.getElementById("wheel-student-count").textContent = "Dữ liệu lỗi";
      const message = document.createElement("li");
      message.className = "roster-empty roster-error";
      message.textContent = error.message;
      list.append(message);
      hint.textContent = "Không thể bắt đầu cho đến khi dữ liệu được sửa.";
      status.textContent = "Kiểm tra dữ liệu";
      updateControls(0);
      global.RandomClass.App.handleError(error);
    }
  }

  function playTone(context, frequency, startAt, duration, volume) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  function playSpinSound(duration) {
    if (!document.getElementById("wheel-sound-toggle").checked) return;
    const AudioContextConstructor = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextConstructor) {
      global.RandomClass.App.notify("Trình duyệt này không hỗ trợ âm thanh.", true);
      return;
    }

    try {
      audioContext = audioContext || new AudioContextConstructor();
      audioContext.resume().then(() => {
        if (!spinning || !document.getElementById("wheel-sound-toggle").checked) return;
        const startAt = audioContext.currentTime + 0.04;
        for (let tick = 0; tick < 23; tick += 1) {
          const elapsed = duration * ((tick + 1) / 23) ** 2;
          playTone(audioContext, 740 - tick * 8, startAt + elapsed / 1000, 0.055, 0.045);
        }
      }).catch((error) => global.RandomClass.App.handleError(error));
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
  }

  function playWinSound() {
    if (!audioContext || !document.getElementById("wheel-sound-toggle").checked) return;
    const startAt = audioContext.currentTime + 0.02;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      playTone(audioContext, frequency, startAt + index * 0.09, 0.38, 0.075);
    });
  }

  function getTransitionDuration(element) {
    const styles = global.getComputedStyle(element);
    const durations = styles.transitionDuration.split(",").map((value) => parseFloat(value) * (value.includes("ms") ? 1 : 1000));
    const delays = styles.transitionDelay.split(",").map((value) => parseFloat(value) * (value.includes("ms") ? 1 : 1000));
    return Math.max(...durations.map((duration, index) => duration + (delays[index % delays.length] || 0)), 0);
  }

  function finishSpin(disc, onTransitionEnd, selected, listName) {
    if (!spinning) return;
    global.clearTimeout(finishTimer);
    disc.removeEventListener("transitionend", onTransitionEnd);
    spinning = false;
    renderRoster();
    document.getElementById("wheel-game-status").textContent = "Đã chọn";
    document.getElementById("wheel-hint").textContent = "Kết quả đã được ghi vào lịch sử.";
    playWinSound();
    try {
      global.RandomClass.History.add({ game: "Vòng xoay may mắn", listName, results: [selected] });
      global.RandomClass.App.renderHistory();
    } catch (error) {
      global.RandomClass.App.handleError(error);
    }
    global.RandomClass.App.showResult(selected);
  }

  function spin() {
    if (spinning) return;
    let active;
    try {
      active = getWheelData();
    } catch (error) {
      renderRoster();
      return;
    }
    if (!active.students.length) {
      global.RandomClass.App.notify("Hãy thêm ít nhất một học sinh vào danh sách lớp trước khi quay.", true);
      return;
    }

    const duration = Number(document.getElementById("wheel-duration").value);
    if (![3, 5, 8, 10].includes(duration)) {
      global.RandomClass.App.notify("Thời gian quay không hợp lệ. Hãy chọn 3, 5, 8 hoặc 10 giây.", true);
      return;
    }

    const noRepeat = document.getElementById("no-repeat-toggle").checked;
    if (noRepeat && active.students.every((student) => spinSession.hasSelected(student))) {
      spinSession.reset();
      global.RandomClass.App.notify("Mỗi học sinh đã được chọn. Phiên không lặp lại đã được đặt lại.");
    }

    const selected = spinSession.chooseOne(active.students, noRepeat);
    if (selected === null) {
      global.RandomClass.App.notify("Không có học sinh khả dụng để chọn.", true);
      return;
    }

    const disc = document.getElementById("wheel-disc");
    const current = Number(disc.dataset.rotation || 0);
    const turns = global.RandomClass.Random.randomInteger(5, 8) * 360;
    const target = ((active.students.indexOf(selected) + 0.5) / active.students.length) * 360;
    const rotation = current + turns + ((360 - target - ((current + turns) % 360) + 360) % 360);
    spinning = true;
    disc.style.transitionDuration = `${duration}s`;
    disc.dataset.rotation = String(rotation);
    disc.style.transform = `rotate(${rotation}deg)`;
    document.getElementById("wheel-game-status").textContent = "Đang quay...";
    document.getElementById("wheel-hint").textContent = "Đang quay... kết quả đã được xác định.";
    updateControls(active.students.length);
    playSpinSound(getTransitionDuration(disc));

    const onTransitionEnd = (event) => {
      if (event.target === disc && event.propertyName === "transform") {
        finishSpin(disc, onTransitionEnd, selected, active.name);
      }
    };
    disc.addEventListener("transitionend", onTransitionEnd);
    finishTimer = global.setTimeout(() => {
      finishSpin(disc, onTransitionEnd, selected, active.name);
    }, getTransitionDuration(disc) + 150);
  }

  function resetSession() {
    if (spinning) return;
    spinSession.reset();
    resetRotation();
    document.getElementById("wheel-game-status").textContent = "Sẵn sàng";
    document.getElementById("wheel-hint").textContent = "Vòng xoay và phiên chọn đã được đặt lại.";
    global.RandomClass.App.notify("Đã đặt lại vòng xoay và phiên chọn.");
  }

  function setDuration(duration) {
    if (![3, 5, 8, 10].includes(duration)) {
      throw new Error("Thời gian quay không hợp lệ. Hãy chọn 3, 5, 8 hoặc 10 giây.");
    }
  }

  global.RandomClass = global.RandomClass || {};
  global.RandomClass.Wheel = { renderRoster, resetSession, setDuration, spin };
})(window);
