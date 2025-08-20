const elements = {
  fileInput: document.getElementById("fileInput"),
  status: document.getElementById("status"),
  tableContainer: document.getElementById("tableContainer"),
  monthSelector: document.getElementById("monthSelector"),
};

const getWeekKey = (date) => {
  const temp = new Date(date);
  const day = temp.getDay() || 7;
  temp.setDate(temp.getDate() + 4 - day);
  const yearStart = new Date(temp.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((temp - yearStart) / 86400000 + 1) / 7);
  return `${temp.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

function parseJsonBlocks(content, fileName) {
  const allTrades = [];
  const matches = content.match(/\[[\s\S]*?\]/g) || [];
  if (!matches.length) {
    console.warn(
      `⚠️ Không tìm thấy đoạn JSON nào trong ${fileName || "input"}`
    );
    return allTrades;
  }
  matches.forEach((block) => {
    try {
      block = block.replace(/^\[\s*,/, "[").replace(/,\s*\]$/, "]");
      const parsed = JSON.parse(block);
      if (Array.isArray(parsed)) {
        allTrades.push(...parsed);
      } else {
        console.warn("Không phải array:", block);
      }
    } catch (err) {
      console.warn(`Lỗi parse đoạn trong ${fileName || "input"}:`, err.message);
    }
  });
  return allTrades;
}

elements.fileInput.addEventListener("change", async (event) => {
  const files = event.target.files;
  if (!files || !files.length) return;
  elements.status.textContent = `Đang đọc ${files.length} file...`;
  const allTrades = [];
  let filesProcessed = 0;

  for (const file of files) {
    try {
      const content = await file.text();
      allTrades.push(...parseJsonBlocks(content, file.name));
    } catch (err) {
      console.error(`❌ Lỗi khi xử lý file ${file.name}:`, err);
    }
    filesProcessed++;
    if (filesProcessed === files.length) {
      elements.status.textContent = allTrades.length
        ? `✅ Loaded ${allTrades.length} trades từ ${files.length} file(s).`
        : `❌ Không load được trade nào từ ${files.length} file.`;
      if (allTrades.length) renderTable(allTrades);
    }
  }
});

function parseRawLogs() {
  const raw = document.getElementById("logInput")?.value?.trim();
  if (!raw) return;
  const allTrades = parseJsonBlocks(raw);
  elements.status.textContent = allTrades.length
    ? `✅ Parsed ${allTrades.length} trades từ ${matches.length} đoạn.`
    : "❌ Không parse được trade nào.";
  if (allTrades.length) renderTable(allTrades);
}

function groupByDate(trades, keyFn) {
  const groups = {};
  const timestamps = {};
  trades.forEach((trade) => {
    const timestamp = parseInt(trade["Entry date"]);
    if (isNaN(timestamp)) return;
    const date = new Date(timestamp);
    const key = keyFn(date);
    if (!groups[key]) {
      groups[key] = [];
      timestamps[key] = timestamp;
    }
    groups[key].push(trade);
    timestamps[key] = Math.min(timestamps[key], timestamp);
  });
  return { groups, timestamps };
}

function renderGroupedTable(title, { groups, timestamps }) {
  const sortedKeys = Object.keys(groups).sort(
    (a, b) => timestamps[a] - timestamps[b]
  );
  let totalRR = 0;
  const html = [
    `<h2>${title}</h2>`,
    ...sortedKeys.map((key) => {
      const group = groups[key];
      let groupRR = 0;
      const rows = group.map((trade) => {
        groupRR += parseFloat(trade["Actual RR"]) || 0;
        return `<tr>${Object.entries(trade)
          .map(([col, value]) => {
            if (col.toLowerCase().includes("date") && !isNaN(value)) {
              value = new Date(parseInt(value)).toLocaleString();
            }
            return `<td>${value}</td>`;
          })
          .join("")}</tr>`;
      });
      totalRR += groupRR;
      return `
        <h3>📅 ${key}</h3>
        <table>
          <tr>${Object.keys(group[0])
            .map((col) => `<th>${col}</th>`)
            .join("")}</tr>
          ${rows.join("")}
          <tr><td colspan="${
            Object.keys(group[0]).length
          }" style="font-weight:bold; text-align:right;">
            📊 Total Actual RR: ${groupRR.toFixed(3)}
          </td></tr>
        </table><br/>
      `;
    }),
    `<h3 style="color: darkblue;">🧾 Tổng Actual RR: ${totalRR.toFixed(
      3
    )}</h3><hr/>`,
  ];
  return html.join("");
}

function renderTable(trades) {
  if (!Array.isArray(trades) || !trades.length) {
    elements.tableContainer.innerHTML = "<p>Không có dữ liệu hợp lệ.</p>";
    return;
  }

  const byWeek = groupByDate(trades, getWeekKey);
  const byMonth = groupByDate(trades, getMonthKey);

  const weeklyRRTable = (() => {
    const { groups, timestamps } = byWeek;
    const sortedWeeks = Object.keys(groups).sort(
      (a, b) => timestamps[a] - timestamps[b]
    );
    let grandTotal = 0;
    const rows = sortedWeeks.map((week) => {
      const sum = groups[week].reduce(
        (sum, trade) => sum + (parseFloat(trade["Actual RR"]) || 0),
        0
      );
      grandTotal += sum;
      return `<tr><td>${week}</td><td>${sum.toFixed(3)}</td></tr>`;
    });
    return `
      <h2>📊 Thống kê RR theo tuần</h2>
      <table>
        <tr><th>Tuần</th><th>Total Actual RR</th></tr>
        ${rows.join("")}
        <tr><td style="font-weight:bold;">Tổng cộng</td><td style="font-weight:bold;">${grandTotal.toFixed(
          3
        )}</td></tr>
      </table><br/>
    `;
  })();

  const rrBySymbolTable = (() => {
    const symbolMap = trades.reduce((map, trade) => {
      const symbol = trade["Symbol"] || "N/A";
      const rr = parseFloat(trade["Actual RR"]) || 0;
      map[symbol] = (map[symbol] || 0) + rr;
      return map;
    }, {});
    const sortedSymbols = Object.keys(symbolMap).sort(
      (a, b) => symbolMap[b] - symbolMap[a]
    );
    let grandTotal = 0;
    const rows = sortedSymbols.map((symbol) => {
      const total = symbolMap[symbol];
      grandTotal += total;
      return `<tr><td>${symbol}</td><td>${total.toFixed(3)}</td></tr>`;
    });
    return `
      <h2>💰 Thống kê RR theo Coin</h2>
      <table>
        <tr><th>Coin</th><th>Total Actual RR</th></tr>
        ${rows.join("")}
        <tr><td style="font-weight:bold;">Tổng cộng</td><td style="font-weight:bold;">${grandTotal.toFixed(
          3
        )}</td></tr>
      </table><br/>
    `;
  })();

  const rrByWeekTopCoinsTable = (() => {
    const symbolMap = trades.reduce((map, trade) => {
      const symbol = trade["Symbol"] || "N/A";
      const rr = parseFloat(trade["Actual RR"]) || 0;
      map[symbol] = (map[symbol] || 0) + rr;
      return map;
    }, {});
    const topCoins = Object.keys(symbolMap)
      .sort((a, b) => symbolMap[b] - symbolMap[a])
      .slice(0, 20);
    const rrByWeekCoin = {};
    const weekTimestamps = {};
    trades.forEach((trade) => {
      const symbol = trade["Symbol"] || "N/A";
      if (!topCoins.includes(symbol)) return;
      const ts = parseInt(trade["Entry date"]);
      if (isNaN(ts)) return;
      const date = new Date(ts);
      const week = getWeekKey(date);
      rrByWeekCoin[week] = rrByWeekCoin[week] || {};
      rrByWeekCoin[week][symbol] =
        (rrByWeekCoin[week][symbol] || 0) +
        (parseFloat(trade["Actual RR"]) || 0);
      weekTimestamps[week] = Math.min(weekTimestamps[week] || ts, ts);
    });
    const sortedWeeks = Object.keys(rrByWeekCoin).sort(
      (a, b) => weekTimestamps[a] - weekTimestamps[b]
    );
    const rows = sortedWeeks.map((week) => {
      let weekTotal = 0;
      const cells = topCoins.map((coin) => {
        const rr = rrByWeekCoin[week][coin] || 0;
        weekTotal += rr;
        return `<td>${rr.toFixed(3)}</td>`;
      });
      return `<tr><td>${week}</td>${cells.join(
        ""
      )}<td style="font-weight:bold;">${weekTotal.toFixed(3)}</td></tr>`;
    });
    const totals = topCoins.map((coin) => {
      const coinTotal = Object.values(rrByWeekCoin).reduce(
        (sum, weekData) => sum + (weekData[coin] || 0),
        0
      );
      return `<td style="font-weight:bold;">${coinTotal.toFixed(3)}</td>`;
    });
    const grandTotal = totals.reduce(
      (sum, cell) => sum + parseFloat(cell.match(/[\d.]+/)[0]),
      0
    );
    return `
      <h2>📈 RR theo tuần cho Top 20 Coin</h2>
      <table>
        <tr><th>Tuần</th>${topCoins
          .map((coin) => `<th>${coin}</th>`)
          .join("")}<th>Total RR</th></tr>
        ${rows.join("")}
        <tr><td style="font-weight:bold;">Tổng cộng</td>${totals.join(
          ""
        )}<td style="font-weight:bold;">${grandTotal.toFixed(3)}</td></tr>
      </table><br/>
    `;
  })();

  const rrByMonthTopCoinsTable = (() => {
    const symbolMap = trades.reduce((map, trade) => {
      const symbol = trade["Symbol"] || "N/A";
      const rr = parseFloat(trade["Actual RR"]) || 0;
      map[symbol] = (map[symbol] || 0) + rr;
      return map;
    }, {});
    const topCoins = Object.keys(symbolMap)
      .sort((a, b) => symbolMap[b] - symbolMap[a])
      .slice(0, 20);
    const rrByMonthCoin = {};
    const monthTimestamps = {};
    trades.forEach((trade) => {
      const symbol = trade["Symbol"] || "N/A";
      if (!topCoins.includes(symbol)) return;
      const ts = parseInt(trade["Entry date"]);
      if (isNaN(ts)) return;
      const date = new Date(ts);
      const month = getMonthKey(date);
      rrByMonthCoin[month] = rrByMonthCoin[month] || {};
      rrByMonthCoin[month][symbol] =
        (rrByMonthCoin[month][symbol] || 0) +
        (parseFloat(trade["Actual RR"]) || 0);
      monthTimestamps[month] = Math.min(monthTimestamps[month] || ts, ts);
    });
    const sortedMonths = Object.keys(rrByMonthCoin).sort(
      (a, b) => monthTimestamps[a] - monthTimestamps[b]
    );
    const rows = sortedMonths.map((month) => {
      let monthTotal = 0;
      const cells = topCoins.map((coin) => {
        const rr = rrByMonthCoin[month][coin] || 0;
        monthTotal += rr;
        return `<td>${rr.toFixed(3)}</td>`;
      });
      return `<tr><td>${month}</td>${cells.join(
        ""
      )}<td style="font-weight:bold;">${monthTotal.toFixed(3)}</td></tr>`;
    });
    const totals = topCoins.map((coin) => {
      const coinTotal = Object.values(rrByMonthCoin).reduce(
        (sum, monthData) => sum + (monthData[coin] || 0),
        0
      );
      return `<td style="font-weight:bold;">${coinTotal.toFixed(3)}</td>`;
    });
    const grandTotal = totals.reduce(
      (sum, cell) => sum + parseFloat(cell.match(/[\d.]+/)[0]),
      0
    );
    return `
      <h2>📈 RR theo tháng cho Top 20 Coin</h2>
      <button onclick='exportTop20CoinsTxt(${JSON.stringify(
        topCoins
      )})'>📥 Export Top 20 Coin (.txt)</button>
      <table>
        <tr><th>Tháng</th>${topCoins
          .map((coin) => `<th>${coin}</th>`)
          .join("")}<th>Total RR</th></tr>
        ${rows.join("")}
        <tr><td style="font-weight:bold;">Tổng cộng</td>${totals.join(
          ""
        )}<td style="font-weight:bold;">${grandTotal.toFixed(3)}</td></tr>
      </table><br/>
    `;
  })();

  const allMonths = Array.from(
    new Set(
      trades
        .map((t) => {
          const ts = parseInt(t["Entry date"]);
          return isNaN(ts) ? null : getMonthKey(new Date(ts));
        })
        .filter(Boolean)
    )
  ).sort();

  elements.monthSelector.innerHTML = `
    <option value="">-- Chọn tháng để lọc --</option><option value="ALL">📦 Xem toàn bộ</option>` +
    allMonths
      .map((month) => `<option value="${month}">${month}</option>`)
      .join("");

  window.allTradesRaw = trades;
  elements.tableContainer.innerHTML = [
    weeklyRRTable,
    rrBySymbolTable,
    rrByWeekTopCoinsTable,
    rrByMonthTopCoinsTable,
    renderGroupedTable("🗓️ Thống kê theo tháng", byMonth),
  ].join("");
}

function handleMonthSelection() {
  const selectedMonth = elements.monthSelector.value;
  if (!selectedMonth) {
    elements.tableContainer.innerHTML =
      "<p>Vui lòng chọn một tháng để xem thống kê.</p>";
    return;
  }
  const trades = window.allTradesRaw;
  const filtered =
    selectedMonth === "ALL"
      ? trades
      : trades.filter((t) => {
          const ts = parseInt(t["Entry date"]);
          return !isNaN(ts) && getMonthKey(new Date(ts)) === selectedMonth;
        });

  const result = filtered.reduce(
    (acc, t) => {
      const type = (t["Type"] || "").trim().toLowerCase();
      const rr = parseFloat(t["Actual RR"]);
      if (type && !isNaN(rr)) {
        acc[type] = acc[type] || { win: 0, loss: 0 };
        acc[type][rr > 0 ? "win" : "loss"]++;
      }
      return acc;
    },
    { long: { win: 0, loss: 0 }, short: { win: 0, loss: 0 } }
  );

  const longTotal = result.long.win + result.long.loss;
  const shortTotal = result.short.win + result.short.loss;
  const summaryHTML = `
    <h2>📊 Thống kê Long/Short - ${selectedMonth}</h2>
    <table>
      <tr><th>Loại</th><th>Thắng</th><th>Thua</th><th>Tổng cộng</th><th>Tỉ lệ win</th></tr>
      <tr><td>Long</td><td>${result.long.win}</td><td>${
    result.long.loss
  }</td><td>${longTotal}</td><td>${
    longTotal ? ((result.long.win / longTotal) * 100).toFixed(1) + "%" : "-"
  }</td></tr>
      <tr><td>Short</td><td>${result.short.win}</td><td>${
    result.short.loss
  }</td><td>${shortTotal}</td><td>${
    shortTotal ? ((result.short.win / shortTotal) * 100).toFixed(1) + "%" : "-"
  }</td></tr>
    </table><br/>
  `;

  const rrByWeek = {};
  const weekTimestamps = {};
  filtered.forEach((t) => {
    const ts = parseInt(t["Entry date"]);
    if (isNaN(ts)) return;
    const week = getWeekKey(new Date(ts));
    rrByWeek[week] =
      (rrByWeek[week] || 0) +
      (parseFloat(t["Actual RR"]) || 0) * (parseFloat(t["Size factor"]) || 1);
    weekTimestamps[week] = Math.min(weekTimestamps[week] || ts, ts);
  });
  const rrWeekHTML = `
    <h2>📅 RR theo tuần - ${selectedMonth}</h2>
    <table>
      <tr><th>Tuần</th><th>Total RR</th></tr>
      ${Object.entries(rrByWeek)
        .sort((a, b) => weekTimestamps[a[0]] - weekTimestamps[b[0]])
        .map(
          ([week, sum]) => `<tr><td>${week}</td><td>${sum.toFixed(3)}</td></tr>`
        )
        .join("")}
    </table><br/>
  `;

  const rrBySymbol = filtered.reduce((map, t) => {
    const sym = t["Symbol"] || "N/A";
    const rr =
      (parseFloat(t["Actual RR"]) || 0) * (parseFloat(t["Size factor"]) || 1);
    map[sym] = (map[sym] || 0) + rr;
    return map;
  }, {});
  const rrCoinHTML = `
    <h2>💰 RR theo coin - ${selectedMonth}</h2>
    <table>
      <tr><th>Coin</th><th>Total RR</th></tr>
      ${Object.entries(rrBySymbol)
        .sort((a, b) => b[1] - a[1])
        .map(
          ([sym, sum]) => `<tr><td>${sym}</td><td>${sum.toFixed(3)}</td></tr>`
        )
        .join("")}
    </table><br/>
  `;

  elements.tableContainer.innerHTML = summaryHTML + rrWeekHTML + rrCoinHTML;
}

function exportToExcel() {
  if (!window.allTradesRaw?.length) {
    alert("Chưa có dữ liệu để export!");
    return;
  }
  const tradesByMonth = window.allTradesRaw.reduce((map, t) => {
    const ts = parseInt(t["Entry date"]);
    if (isNaN(ts)) return map;
    const month = getMonthKey(new Date(ts));
    map[month] = map[month] || [];
    map[month].push(t);
    return map;
  }, {});
  const wb = XLSX.utils.book_new();
  Object.keys(tradesByMonth).forEach((month) => {
    const filtered = tradesByMonth[month];
    const ws_data = [
      [`📊 Summary for ${month}`],
      ["Loại", "Thắng", "Thua", "Tổng cộng", "Tỉ lệ win"],
    ];
    const result = filtered.reduce(
      (acc, t) => {
        const type = (t["Type"] || "").trim().toLowerCase();
        const rr = parseFloat(t["Actual RR"]);
        if (type && !isNaN(rr)) {
          acc[type] = acc[type] || { win: 0, loss: 0 };
          acc[type][rr > 0 ? "win" : "loss"]++;
        }
        return acc;
      },
      { long: { win: 0, loss: 0 }, short: { win: 0, loss: 0 } }
    );
    ws_data.push([
      "Long",
      result.long.win,
      result.long.loss,
      result.long.win + result.long.loss,
      result.long.win + result.long.loss
        ? (
            (result.long.win / (result.long.win + result.long.loss)) *
            100
          ).toFixed(1) + "%"
        : "-",
    ]);
    ws_data.push([
      "Short",
      result.short.win,
      result.short.loss,
      result.short.win + result.short.loss,
      result.short.win + result.short.loss
        ? (
            (result.short.win / (result.short.win + result.short.loss)) *
            100
          ).toFixed(1) + "%"
        : "-",
    ]);
    ws_data.push([""], [`📅 RR theo tuần - ${month}`], ["Tuần", "Total RR"]);
    const rrByWeek = {};
    const weekTimestamps = {};
    filtered.forEach((t) => {
      const ts = parseInt(t["Entry date"]);
      if (isNaN(ts)) return;
      const week = getWeekKey(new Date(ts));
      rrByWeek[week] =
        (rrByWeek[week] || 0) +
        (parseFloat(t["Actual RR"]) || 0) * (parseFloat(t["Size factor"]) || 1);
      weekTimestamps[week] = Math.min(weekTimestamps[week] || ts, ts);
    });
    Object.entries(rrByWeek)
      .sort((a, b) => weekTimestamps[a[0]] - weekTimestamps[b[0]])
      .forEach(([week, sum]) => ws_data.push([week, sum.toFixed(3)]));
    ws_data.push([""], [`💰 RR theo coin - ${month}`], ["Coin", "Total RR"]);
    const rrBySymbol = filtered.reduce((map, t) => {
      const sym = t["Symbol"] || "N/A";
      const rr =
        (parseFloat(t["Actual RR"]) || 0) * (parseFloat(t["Size factor"]) || 1);
      map[sym] = (map[sym] || 0) + rr;
      return map;
    }, {});
    Object.entries(rrBySymbol)
      .sort((a, b) => b[1] - a[1])
      .forEach(([sym, sum]) => ws_data.push([sym, sum.toFixed(3)]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws_data), month);
  });
  XLSX.writeFile(wb, "Trade_Stats_By_Month.xlsx");
}

function exportTop20CoinsTxt(topCoins) {
  if (!topCoins?.length) {
    alert("Không có dữ liệu top coin để export!");
    return;
  }
  const blob = new Blob([
    topCoins.map((c) => `BITGET:${c}`).join(".P,"),
    { type: "text/plain;charset=utf-8" },
  ]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Top20_Coins.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}
