
const targetHours = 205;

async function getHolidays(year) {
  const res = await fetch(`https://holidays-jp.github.io/api/v1/${year}/date.json`);
  return await res.json();
}

function parseTimeText(text) {
  const match = text.match(/(\d+)\s*時間\s*(\d+)?\s*分?/);
  if (!match) return null;
  const hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  return hours * 60 + minutes;
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}時間${m}分`;
}

function addDateInput(containerId) {
  const container = document.getElementById(containerId);
  const div = document.createElement("div");
  div.className = "date-entry";
  div.innerHTML = `<input type="date"><button onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(div);
}

function getDateList(containerId) {
  const inputs = document.querySelectorAll(`#${containerId} input[type="date"]`);
  return Array.from(inputs)
    .map(input => input.value)
    .filter(dateStr => dateStr);
}

function copyResult() {
  const resultText = document.getElementById("result").innerText;
  navigator.clipboard.writeText(resultText).then(() => {
    alert("結果をコピーしました！");
  });
}

async function calculate() {
  const name = document.getElementById("username").value.trim() || "（名前なし）";
  const timeText = document.getElementById("workTime").value.trim();
  const totalInputMins = parseTimeText(timeText);
  if (totalInputMins === null) {
    alert("「60時間36分」形式で入力してください。");
    return;
  }

  const paidLeaveDates = getDateList("paidLeaveList");
  const substituteLeaveDates = getDateList("substituteLeaveList");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = `${year}年${month + 1}月`;

  const targetMins = targetHours * 60;
  const remainingMins = targetMins - totalInputMins;

  const holidays = await getHolidays(year);
  const holidayDates = Object.keys(holidays).map(d => new Date(d));

  const includeToday = document.getElementById("includeToday").checked;
  const startDay = includeToday ? now.getDate() : now.getDate() + 1;

  let remainingWeekdays = 0;
  for (let day = startDay; day <= new Date(year, month + 1, 0).getDate(); day++) {
    const date = new Date(year, month, day);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isHoliday = holidayDates.some(h => h.toDateString() === date.toDateString());
    if (!isWeekend && !isHoliday) {
      remainingWeekdays++;
    }
  }

  const adjustedWeekdays = Math.max(
    remainingWeekdays - paidLeaveDates.length - substituteLeaveDates.length,
    0
  );
  const avgMins = adjustedWeekdays ? Math.ceil(remainingMins / adjustedWeekdays) : 0;

  let resultHtml = `
    <p><strong>${name}</strong> さんの ${monthLabel} の集計結果</p>
    <p>入力された労働時間: ${formatMinutes(totalInputMins)}</p>
    <p>205時間までの残り時間: ${formatMinutes(remainingMins)}</p>
    <p>今月の残り営業日（${includeToday ? '本日含む' : '本日除く'}）: ${remainingWeekdays}日</p>
  `;

  if (paidLeaveDates.length > 0) {
    resultHtml += `<p>有給休暇: ${paidLeaveDates.length}日 (${paidLeaveDates.join(', ')})</p>`;
  }

  if (substituteLeaveDates.length > 0) {
    resultHtml += `<p>振替休日: ${substituteLeaveDates.length}日 (${substituteLeaveDates.join(', ')})</p>`;
  }

  if (paidLeaveDates.length + substituteLeaveDates.length > 0) {
    resultHtml += `<p>実質の残り営業日: ${adjustedWeekdays}日</p>`;
  }

  resultHtml += `<div class="result-highlight">1日平均必要時間: ${formatMinutes(avgMins)}</div>`;

  document.getElementById("result").innerHTML = resultHtml;
  document.getElementById("copyBtn").style.display = "inline-block";
}
