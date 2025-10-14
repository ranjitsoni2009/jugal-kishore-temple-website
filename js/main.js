function renderCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  const today = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = today.getMonth(), year = today.getFullYear();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '<h6>' + monthNames[month] + ' ' + year + '</h6>';
  html += '<table class="table table-bordered table-sm"><thead><tr><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr></thead><tbody><tr>';
  for (let i = 0; i < firstDay; i++) html += '<td></td>';
  for (let day = 1; day <= daysInMonth; day++) {
    if ((firstDay + day - 1) % 7 === 0) html += '</tr><tr>';
    html += '<td>' + day + '</td>';
  }
  html += '</tr></tbody></table>';
  calendarEl.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', renderCalendar);
