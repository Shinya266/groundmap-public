const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const puppeteer = require("puppeteer");

const app = express();
const PORT = 4350;
const PUBLIC_BASE_URL = "http://149.28.158.18:4350";

const DATA_FILE = path.join(__dirname, "data", "specimens.json");
const PDF_DIR = path.join(__dirname, "pdf");
const UPLOAD_DIR = path.join(__dirname, "uploads");

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(PDF_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

app.use(cors());
app.use(express.json({ limit: "60mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/pdf", express.static(PDF_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg");
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  }
});

const upload = multer({ storage });

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "[]");
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeFileName(str = "land-specimen") {
  return String(str)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function findItemOr404(req, res) {
  const item = readData().find(x => x.id === req.params.id);
  if (!item) {
    res.status(404).json({ ok: false, error: "not_found" });
    return null;
  }
  return item;
}

function buildPdfHtml(item) {
  const lat = Number(item.lat);
  const lng = Number(item.lng);

  const mapImage = item.mapImage || "";
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  const photoHtml = (item.images || [])
    .slice(0, 4)
    .map(img => `<img src="${escapeHtml(img.url)}" class="photo" />`)
    .join("");

  return `
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * {
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 12mm;
      }

      body {
        font-family: "Noto Sans CJK JP", "Noto Sans JP", "DejaVu Sans", Arial, sans-serif;
        color: #111;
        background: #fff;
        margin: 0;
        padding: 0;
        font-size: 12px;
      }

      .page {
        width: 100%;
      }

      .top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #111;
        padding-bottom: 10px;
        margin-bottom: 12px;
      }

      .brand {
        font-size: 12px;
        color: #555;
        margin-bottom: 4px;
      }

      h1 {
        font-size: 25px;
        line-height: 1.25;
        margin: 0;
      }

      .doc {
        text-align: right;
        color: #555;
        font-size: 10px;
        line-height: 1.6;
      }

      .status {
        display: inline-block;
        background: #111;
        color: #fff;
        padding: 5px 11px;
        border-radius: 999px;
        font-weight: bold;
        font-size: 11px;
      }

      .mapBox {
        border: 1px solid #ddd;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 10px;
        background: #f7f7f7;
      }

      .mapImage {
        width: 100%;
        height: 280px;
        object-fit: cover;
        display: block;
      }

      .mapFallback {
        padding: 18px;
        color: #555;
        font-size: 11px;
        word-break: break-all;
      }

      .grid3 {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        margin-bottom: 8px;
      }

      .grid2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 8px;
      }

      .box {
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 10px 11px;
        min-height: 54px;
      }

      .label {
        font-size: 9.5px;
        color: #666;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 5px;
      }

      .value {
        font-size: 12.5px;
        line-height: 1.55;
        white-space: pre-wrap;
      }

      .memoBox,
      .summaryBox {
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 10px 11px;
        margin-bottom: 8px;
        min-height: 58px;
      }

      .summaryBox {
        background: #fafafa;
      }

      .photoArea {
        border: 1px solid #ddd;
        border-radius: 10px;
        padding: 10px 11px;
        margin-top: 8px;
      }

      .photos {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 8px;
      }

      .photo {
        width: 100%;
        height: 130px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #ddd;
      }

      .noPhoto {
        color: #777;
        background: #f3f3f3;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }

      .footer {
        margin-top: 10px;
        border-top: 1px solid #ddd;
        padding-top: 7px;
        font-size: 9.5px;
        color: #777;
        display: flex;
        justify-content: space-between;
      }
    </style>
  </head>

  <body>
    <div class="page">
      <div class="top">
        <div>
          <div class="brand">GroundMap Land Investigation Sheet</div>
          <h1>${escapeHtml(item.title || "Land Specimen")}</h1>
        </div>
        <div class="doc">
          <div><span class="status">${escapeHtml(item.status || "調査中")}</span></div>
          <div style="margin-top:8px;">Exported by GroundMap v0.8</div>
        </div>
      </div>

      <div class="mapBox">
        ${
          mapImage
            ? `<img class="mapImage" src="${mapImage}" />`
            : `<div class="mapFallback">Map Image Not Available<br>${escapeHtml(osmUrl)}</div>`
        }
      </div>

      <div class="grid3">
        <div class="box">
          <div class="label">Latitude</div>
          <div class="value">${lat}</div>
        </div>
        <div class="box">
          <div class="label">Longitude</div>
          <div class="value">${lng}</div>
        </div>
        <div class="box">
          <div class="label">Tags</div>
          <div class="value">${escapeHtml(item.tags || "なし")}</div>
        </div>
      </div>

      <div class="grid3">
        <div class="box">
          <div class="label">Road Access / 接道</div>
          <div class="value">${escapeHtml(item.roadAccess || "未確認")}</div>
        </div>
        <div class="box">
          <div class="label">Zoning / 用途地域</div>
          <div class="value">${escapeHtml(item.zoning || "未確認")}</div>
        </div>
        <div class="box">
          <div class="label">Farmland / 農地</div>
          <div class="value">${escapeHtml(item.farmland || "未確認")}</div>
        </div>
      </div>

      <div class="grid3">
        <div class="box">
          <div class="label">Hazard / ハザード</div>
          <div class="value">${escapeHtml(item.hazard || "未確認")}</div>
        </div>
        <div class="box">
          <div class="label">Grading / 造成</div>
          <div class="value">${escapeHtml(item.grading || "不明")}</div>
        </div>
        <div class="box">
          <div class="label">Infrastructure / インフラ</div>
          <div class="value">${escapeHtml(item.infrastructure || "未確認")}</div>
        </div>
      </div>

      <div class="grid3">
        <div class="box">
          <div class="label">Parcel Number / 地番</div>
          <div class="value">${escapeHtml(item.parcelNumber || "未入力")}</div>
        </div>
        <div class="box">
          <div class="label">Registry / 登記取得</div>
          <div class="value">${escapeHtml(item.registryStatus || "未取得")}</div>
        </div>
        <div class="box">
          <div class="label">Owner / 所有者名</div>
          <div class="value">${escapeHtml(item.ownerName || "未入力")}</div>
        </div>
      </div>

      <div class="grid3">
        <div class="box">
          <div class="label">Land Category / 地目</div>
          <div class="value">${escapeHtml(item.landCategory || "未入力")}</div>
        </div>
        <div class="box">
          <div class="label">Land Area / 地積</div>
          <div class="value">${escapeHtml(item.landArea || "未入力")}</div>
        </div>
        <div class="box">
          <div class="label">Mortgage / 抵当権</div>
          <div class="value">${escapeHtml(item.mortgageStatus || "要確認")}</div>
        </div>
      </div>

      <div class="grid2">
        <div class="box">
          <div class="label">Registry Date / 登記取得日</div>
          <div class="value">${escapeHtml(item.registryDate || "未入力")}</div>
        </div>
        <div class="box">
          <div class="label">Registry PDF / 謄本PDF</div>
          <div class="value">${item.registryPdf ? escapeHtml(item.registryPdf.originalName || item.registryPdf.filename || "添付あり") : "未添付"}</div>
        </div>
      </div>

      <div class="grid3">
        <div class="box">
          <div class="label">Building No. / 家屋番号</div>
          <div class="value">${escapeHtml(item.buildingNumber || "未入力")}</div>
        </div>
        <div class="box">
          <div class="label">Real Estate No. / 不動産番号</div>
          <div class="value">${escapeHtml(item.realEstateNumber || "未入力")}</div>
        </div>
        <div class="box">
          <div class="label">Extract Status / 謄本読取</div>
          <div class="value">${escapeHtml(item.registryExtractStatus || "未読取")}</div>
        </div>
      </div>

      <div class="memoBox">
        <div class="label">Rights Memo / 権利部メモ</div>
        <div class="value">${escapeHtml(item.rightsMemo || "なし")}</div>
      </div>

      <div class="grid2">
        <div class="box">
          <div class="label">Mortgage Memo / 抵当権メモ</div>
          <div class="value">${escapeHtml(item.mortgageMemo || "なし")}</div>
        </div>
        <div class="box">
          <div class="label">Joint Collateral / 共同担保</div>
          <div class="value">${escapeHtml(item.jointCollateral || "なし")}</div>
        </div>
      </div>

      <div class="memoBox">
        <div class="label">Registry Caution / 注意事項</div>
        <div class="value">${escapeHtml(item.registryCaution || "なし")}</div>
      </div>

      <div class="memoBox">
        <div class="label">Registry Extract Memo / 謄本抽出メモ</div>
        <div class="value">${escapeHtml(item.registryExtractMemo || "なし")}</div>
      </div>

      <div class="memoBox">
        <div class="label">Registry Memo / 登記メモ</div>
        <div class="value">${escapeHtml(item.registryMemo || "なし")}</div>
      </div>

      <div class="memoBox">
        <div class="label">Memo</div>
        <div class="value">${escapeHtml(item.memo || "なし")}</div>
      </div>

      <div class="summaryBox">
        <div class="label">Field Summary</div>
        <div class="value">${escapeHtml(item.aiSummary || "なし")}</div>
      </div>

      <div class="photoArea">
        <div class="label">Photos</div>
        ${
          photoHtml
            ? `<div class="photos">${photoHtml}</div>`
            : `<div class="noPhoto">No photos</div>`
        }
      </div>

      <div class="footer">
        <div>
          Created: ${escapeHtml(item.createdAt || "")}<br/>
          Updated: ${escapeHtml(item.updatedAt || "")}
        </div>
        <div>
          GroundMap / Local Land Investigation Tool
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

async function createPdfBuffer(item) {
  const html = buildPdfHtml(item);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none"
    ]
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle2",
    timeout: 45000
  });

  await page.evaluateHandle("document.fonts.ready");

  const buffer = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: "0mm",
      right: "0mm",
      bottom: "0mm",
      left: "0mm"
    }
  });

  await browser.close();

  return buffer;
}

app.get("/api/specimens", (req, res) => {
  res.json(readData());
});

app.get("/api/specimens/:id", (req, res) => {
  const item = findItemOr404(req, res);
  if (!item) return;
  res.json(item);
});

app.post("/api/specimens", upload.fields([
  { name: "images", maxCount: 8 },
  { name: "registryPdf", maxCount: 1 }
]), (req, res) => {
  const items = readData();

  const imageUrls = ((req.files && req.files.images) || []).map(file => ({
    filename: file.filename,
    url: `${PUBLIC_BASE_URL}/uploads/${file.filename}`
  }));

  const registryPdfFile = req.files && req.files.registryPdf && req.files.registryPdf[0];
  const registryPdf = registryPdfFile
    ? {
        filename: registryPdfFile.filename,
        originalName: registryPdfFile.originalname,
        url: `${PUBLIC_BASE_URL}/uploads/${registryPdfFile.filename}`
      }
    : null;

  const item = {
    id: Date.now().toString(),
    title: req.body.title || "Untitled Land",
    lat: Number(req.body.lat),
    lng: Number(req.body.lng),
    memo: req.body.memo || "",
    status: req.body.status || "調査中",
    tags: req.body.tags || "",
    roadAccess: req.body.roadAccess || "未確認",
    zoning: req.body.zoning || "未確認",
    farmland: req.body.farmland || "未確認",
    hazard: req.body.hazard || "未確認",
    grading: req.body.grading || "不明",
    infrastructure: req.body.infrastructure || "未確認",
    parcelNumber: req.body.parcelNumber || "",
    registryStatus: req.body.registryStatus || "未取得",
    ownerName: req.body.ownerName || "",
    landCategory: req.body.landCategory || "",
    landArea: req.body.landArea || "",
    mortgageStatus: req.body.mortgageStatus || "要確認",
    registryDate: req.body.registryDate || "",
    registryMemo: req.body.registryMemo || "",
    buildingNumber: req.body.buildingNumber || "",
    realEstateNumber: req.body.realEstateNumber || "",
    registryExtractStatus: req.body.registryExtractStatus || "未読取",
    rightsMemo: req.body.rightsMemo || "",
    mortgageMemo: req.body.mortgageMemo || "",
    jointCollateral: req.body.jointCollateral || "",
    registryCaution: req.body.registryCaution || "",
    registryExtractMemo: req.body.registryExtractMemo || "",
    registryPdf,
    aiSummary:
      req.body.aiSummary ||
      "現地写真・接道・用途地域・農地転用・災害Layerの追加確認が必要。",
    images: imageUrls,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  items.unshift(item);
  writeData(items);
  res.json(item);
});

app.put("/api/specimens/:id", upload.fields([
  { name: "images", maxCount: 8 },
  { name: "registryPdf", maxCount: 1 }
]), (req, res) => {
  const items = readData();
  const index = items.findIndex(x => x.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ ok: false, error: "not_found" });
  }

  const oldItem = items[index];

  const newImages = ((req.files && req.files.images) || []).map(file => ({
    filename: file.filename,
    url: `${PUBLIC_BASE_URL}/uploads/${file.filename}`
  }));

  const newRegistryPdfFile = req.files && req.files.registryPdf && req.files.registryPdf[0];
  const newRegistryPdf = newRegistryPdfFile
    ? {
        filename: newRegistryPdfFile.filename,
        originalName: newRegistryPdfFile.originalname,
        url: `${PUBLIC_BASE_URL}/uploads/${newRegistryPdfFile.filename}`
      }
    : null;

  const updated = {
    ...oldItem,
    title: req.body.title ?? oldItem.title,
    memo: req.body.memo ?? oldItem.memo,
    status: req.body.status ?? oldItem.status,
    tags: req.body.tags ?? oldItem.tags,
    roadAccess: req.body.roadAccess ?? oldItem.roadAccess ?? "未確認",
    zoning: req.body.zoning ?? oldItem.zoning ?? "未確認",
    farmland: req.body.farmland ?? oldItem.farmland ?? "未確認",
    hazard: req.body.hazard ?? oldItem.hazard ?? "未確認",
    grading: req.body.grading ?? oldItem.grading ?? "不明",
    infrastructure: req.body.infrastructure ?? oldItem.infrastructure ?? "未確認",
    parcelNumber: req.body.parcelNumber ?? oldItem.parcelNumber ?? "",
    registryStatus: req.body.registryStatus ?? oldItem.registryStatus ?? "未取得",
    ownerName: req.body.ownerName ?? oldItem.ownerName ?? "",
    landCategory: req.body.landCategory ?? oldItem.landCategory ?? "",
    landArea: req.body.landArea ?? oldItem.landArea ?? "",
    mortgageStatus: req.body.mortgageStatus ?? oldItem.mortgageStatus ?? "要確認",
    registryDate: req.body.registryDate ?? oldItem.registryDate ?? "",
    registryMemo: req.body.registryMemo ?? oldItem.registryMemo ?? "",
    buildingNumber: req.body.buildingNumber ?? oldItem.buildingNumber ?? "",
    realEstateNumber: req.body.realEstateNumber ?? oldItem.realEstateNumber ?? "",
    registryExtractStatus: req.body.registryExtractStatus ?? oldItem.registryExtractStatus ?? "未読取",
    rightsMemo: req.body.rightsMemo ?? oldItem.rightsMemo ?? "",
    mortgageMemo: req.body.mortgageMemo ?? oldItem.mortgageMemo ?? "",
    jointCollateral: req.body.jointCollateral ?? oldItem.jointCollateral ?? "",
    registryCaution: req.body.registryCaution ?? oldItem.registryCaution ?? "",
    registryExtractMemo: req.body.registryExtractMemo ?? oldItem.registryExtractMemo ?? "",
    registryPdf: newRegistryPdf || oldItem.registryPdf || null,
    aiSummary: req.body.aiSummary ?? oldItem.aiSummary,
    images: [...(oldItem.images || []), ...newImages],
    updatedAt: new Date().toISOString()
  };

  items[index] = updated;
  writeData(items);

  res.json(updated);
});

app.delete("/api/specimens/:id", (req, res) => {
  const items = readData().filter(x => x.id !== req.params.id);
  writeData(items);
  res.json({ ok: true });
});

app.post("/api/pdf/export", async (req, res) => {
  try {
    const item = req.body;
    const fileName = `groundmap-${safeFileName(item.title || item.id || Date.now())}.pdf`;
    const filePath = path.join(PDF_DIR, fileName);

    const buffer = await createPdfBuffer(item);
    fs.writeFileSync(filePath, buffer);

    res.json({ ok: true, url: `/pdf/${fileName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "pdf_failed", message: err.message });
  }
});

app.post("/api/pdf/view", async (req, res) => {
  try {
    const item = req.body;
    const buffer = await createPdfBuffer(item);
    const fileName = `groundmap-${safeFileName(item.title || item.id || Date.now())}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "pdf_view_failed", message: err.message });
  }
});

app.post("/api/pdf/download", async (req, res) => {
  try {
    const item = req.body;
    const buffer = await createPdfBuffer(item);
    const fileName = `groundmap-${safeFileName(item.title || item.id || Date.now())}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "pdf_download_failed", message: err.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true, name: "groundmap-backend", version: "0.8", port: PORT });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`GroundMap backend running on ${PORT}`);
});


