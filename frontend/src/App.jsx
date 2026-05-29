import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const API = "http://149.28.158.18:4350";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

function statusColor(status) {
  if (status === "有望") return "#16a34a";
  if (status === "保留") return "#f59e0b";
  if (status === "危険") return "#dc2626";
  if (status === "候補外") return "#64748b";
  return "#2563eb";
}

function createPinIcon(status) {
  const color = statusColor(status);

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:24px;
        height:24px;
        background:${color};
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
      ">
        <div style="
          width:8px;
          height:8px;
          background:white;
          border-radius:50%;
          margin:5px;
        "></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -28]
  });
}

const newPinIcon = createPinIcon("新規");

function ClickMap({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    }
  });
  return null;
}

function FlyToPoint({ point }) {
  const map = useMap();

  useEffect(() => {
    if (point?.lat && point?.lng) {
      map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 16), {
        animate: true,
        duration: 0.7
      });
    }
  }, [point, map]);

  return null;
}

export default function App() {
  const mapShotRef = useRef(null);

  const [picked, setPicked] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("create");

  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState("調査中");
  const [tags, setTags] = useState("");
  const [roadAccess, setRoadAccess] = useState("未確認");
  const [zoning, setZoning] = useState("未確認");
  const [farmland, setFarmland] = useState("未確認");
  const [hazard, setHazard] = useState("未確認");
  const [grading, setGrading] = useState("不明");
  const [infrastructure, setInfrastructure] = useState("未確認");

  const [parcelNumber, setParcelNumber] = useState("");
  const [registryStatus, setRegistryStatus] = useState("未取得");
  const [ownerName, setOwnerName] = useState("");
  const [landCategory, setLandCategory] = useState("");
  const [landArea, setLandArea] = useState("");
  const [mortgageStatus, setMortgageStatus] = useState("要確認");
  const [registryDate, setRegistryDate] = useState("");
  const [registryMemo, setRegistryMemo] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [realEstateNumber, setRealEstateNumber] = useState("");
  const [registryExtractStatus, setRegistryExtractStatus] = useState("未読取");
  const [rightsMemo, setRightsMemo] = useState("");
  const [mortgageMemo, setMortgageMemo] = useState("");
  const [jointCollateral, setJointCollateral] = useState("");
  const [registryCaution, setRegistryCaution] = useState("");
  const [registryExtractMemo, setRegistryExtractMemo] = useState("");
  const [registryPdf, setRegistryPdf] = useState(null);

  const [images, setImages] = useState([]);

  const [editId, setEditId] = useState(null);
  const [editImages, setEditImages] = useState([]);

  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pdfBusyId, setPdfBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const selectedPoint = picked || selected;

  async function load() {
    const res = await axios.get(`${API}/api/specimens`);
    setItems(res.data);

    if (selected?.id) {
      const fresh = res.data.find(x => x.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    if (!memo && !tags) return "現地確認・接道・用途地域・農地転用・災害Layerの追加確認が必要。";
    return "一次保存完了後、接道・用途地域・ハザード・農地転用・周辺インフラを確認。";
  }, [memo, tags]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const text = `${item.title || ""} ${item.memo || ""} ${item.tags || ""} ${item.status || ""}`.toLowerCase();
      const q = query.toLowerCase();
      const statusOk = statusFilter === "ALL" || item.status === statusFilter;
      return text.includes(q) && statusOk;
    });
  }, [items, query, statusFilter]);

  function resetForm() {
    setTitle("");
    setMemo("");
    setStatus("調査中");
    setTags("");
    setRoadAccess("未確認");
    setZoning("未確認");
    setFarmland("未確認");
    setHazard("未確認");
    setGrading("不明");
    setInfrastructure("未確認");
    setParcelNumber("");
    setRegistryStatus("未取得");
    setOwnerName("");
    setLandCategory("");
    setLandArea("");
    setMortgageStatus("要確認");
    setRegistryDate("");
    setRegistryMemo("");
    setBuildingNumber("");
    setRealEstateNumber("");
    setRegistryExtractStatus("未読取");
    setRightsMemo("");
    setMortgageMemo("");
    setJointCollateral("");
    setRegistryCaution("");
    setRegistryExtractMemo("");
    setRegistryPdf(null);
    setImages([]);
    setEditImages([]);
    setEditId(null);
  }

  function startEdit(item) {
    setEditId(item.id);
    setTitle(item.title || "");
    setMemo(item.memo || "");
    setStatus(item.status || "調査中");
    setTags(item.tags || "");
    setRoadAccess(item.roadAccess || "未確認");
    setZoning(item.zoning || "未確認");
    setFarmland(item.farmland || "未確認");
    setHazard(item.hazard || "未確認");
    setGrading(item.grading || "不明");
    setInfrastructure(item.infrastructure || "未確認");
    setParcelNumber(item.parcelNumber || "");
    setRegistryStatus(item.registryStatus || "未取得");
    setOwnerName(item.ownerName || "");
    setLandCategory(item.landCategory || "");
    setLandArea(item.landArea || "");
    setMortgageStatus(item.mortgageStatus || "要確認");
    setRegistryDate(item.registryDate || "");
    setRegistryMemo(item.registryMemo || "");
    setBuildingNumber(item.buildingNumber || "");
    setRealEstateNumber(item.realEstateNumber || "");
    setRegistryExtractStatus(item.registryExtractStatus || "未読取");
    setRightsMemo(item.rightsMemo || "");
    setMortgageMemo(item.mortgageMemo || "");
    setJointCollateral(item.jointCollateral || "");
    setRegistryCaution(item.registryCaution || "");
    setRegistryExtractMemo(item.registryExtractMemo || "");
    setRegistryPdf(null);
    setImages([]);
    setEditImages([]);
    setSelected(item);
    setPicked(null);
    setTab("create");
  }

  async function saveSpecimen() {
    if (!picked && !editId) return alert("地図をクリックして土地を選択");

    setSaving(true);

    try {
      const form = new FormData();
      form.append("title", title || "Untitled Land");
      form.append("memo", memo);
      form.append("status", status);
      form.append("tags", tags);
      form.append("roadAccess", roadAccess);
      form.append("zoning", zoning);
      form.append("farmland", farmland);
      form.append("hazard", hazard);
      form.append("grading", grading);
      form.append("infrastructure", infrastructure);
      form.append("parcelNumber", parcelNumber);
      form.append("registryStatus", registryStatus);
      form.append("ownerName", ownerName);
      form.append("landCategory", landCategory);
      form.append("landArea", landArea);
      form.append("mortgageStatus", mortgageStatus);
      form.append("registryDate", registryDate);
      form.append("registryMemo", registryMemo);
      form.append("buildingNumber", buildingNumber);
      form.append("realEstateNumber", realEstateNumber);
      form.append("registryExtractStatus", registryExtractStatus);
      form.append("rightsMemo", rightsMemo);
      form.append("mortgageMemo", mortgageMemo);
      form.append("jointCollateral", jointCollateral);
      form.append("registryCaution", registryCaution);
      form.append("registryExtractMemo", registryExtractMemo);
      if (registryPdf) form.append("registryPdf", registryPdf);
      form.append("aiSummary", summary);

      if (!editId) {
        form.append("lat", picked.lat);
        form.append("lng", picked.lng);
        for (const file of images) form.append("images", file);

        const res = await axios.post(`${API}/api/specimens`, form, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        setSelected(res.data);
      } else {
        for (const file of editImages) form.append("images", file);

        const res = await axios.put(`${API}/api/specimens/${editId}`, form, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        setSelected(res.data);
      }

      resetForm();
      setPicked(null);
      setTab("selected");
      await load();
    } catch (err) {
      console.error(err);
      alert("保存失敗。backendログ確認。");
    } finally {
      setSaving(false);
    }
  }

  async function captureMapImage() {
    if (!mapShotRef.current) return "";

    try {
      const canvas = await html2canvas(mapShotRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scale: 1
      });

      return canvas.toDataURL("image/jpeg", 0.82);
    } catch (err) {
      console.error("map capture failed", err);
      return "";
    }
  }

  async function buildPdfPayload(item) {
    const mapImage = await captureMapImage();
    return {
      ...item,
      mapImage
    };
  }

  async function openPdf(item) {
    if (!item?.id) return;

    setPdfBusyId(item.id);

    try {
      const payload = await buildPdfPayload(item);

      const res = await axios.post(`${API}/api/pdf/view`, payload, {
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" })
      );

      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("PDF表示失敗。backendログ確認。");
    } finally {
      setPdfBusyId(null);
    }
  }

  async function downloadPdf(item) {
    if (!item?.id) return;

    setPdfBusyId(item.id);

    try {
      const payload = await buildPdfPayload(item);

      const res = await axios.post(`${API}/api/pdf/download`, payload, {
        responseType: "blob"
      });

      const safeTitle = String(item.title || "land-specimen")
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, "_");

      const blobUrl = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" })
      );

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `groundmap-${safeTitle}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("PDF保存失敗。backendログ確認。");
    } finally {
      setPdfBusyId(null);
    }
  }

  async function deleteItem(id) {
    if (!confirm("削除する？")) return;

    await axios.delete(`${API}/api/specimens/${id}`);

    if (selected?.id === id) setSelected(null);
    if (editId === id) resetForm();

    await load();
    setTab("list");
  }

  function selectItem(item) {
    setSelected(item);
    setPicked(null);
    setTab("selected");
  }

  function clickNewPoint(p) {
    setPicked(p);
    setSelected(null);
    resetForm();
    setTab("create");
  }

  return (
    <div style={styles.app}>
      <div style={styles.mapArea} ref={mapShotRef}>
        <MapContainer center={[35.6639, 138.5684]} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin="anonymous"
          />

          <ClickMap onPick={clickNewPoint} />
          <FlyToPoint point={selectedPoint} />

          {picked && (
            <Marker position={[picked.lat, picked.lng]} icon={newPinIcon}>
              <Popup>新規保存地点</Popup>
            </Marker>
          )}

          {items.map(item => (
            <Marker
              key={item.id}
              position={[item.lat, item.lng]}
              icon={createPinIcon(item.status)}
              eventHandlers={{ click: () => selectItem(item) }}
            >
              <Popup>
                <b>{item.title}</b>
                <br />
                {item.status}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div style={styles.legend}>
          <div><span style={{ ...styles.dot, background: "#2563eb" }} />調査中</div>
          <div><span style={{ ...styles.dot, background: "#16a34a" }} />有望</div>
          <div><span style={{ ...styles.dot, background: "#f59e0b" }} />保留</div>
          <div><span style={{ ...styles.dot, background: "#dc2626" }} />危険</div>
          <div><span style={{ ...styles.dot, background: "#64748b" }} />候補外</div>
        </div>
      </div>

      <aside style={styles.side}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.logo}>GroundMap</h1>
            <div style={styles.sub}>土地調査・標本保存・PDF共有</div>
          </div>
          <div style={styles.version}>v0.8</div>
        </header>

        <div style={styles.point}>
          <div style={styles.pointTitle}>現在選択中の地点</div>
          {selectedPoint ? (
            <div style={styles.coords}>
              <span>Lat {Number(selectedPoint.lat).toFixed(6)}</span>
              <span>Lng {Number(selectedPoint.lng).toFixed(6)}</span>
            </div>
          ) : (
            <div style={styles.empty}>地図をクリック、または保存済みPinを選択</div>
          )}
        </div>

        <nav style={styles.tabs}>
          <button style={tab === "create" ? styles.tabActive : styles.tab} onClick={() => setTab("create")}>
            {editId ? "編集中" : "新規保存"}
          </button>
          <button style={tab === "selected" ? styles.tabActive : styles.tab} onClick={() => setTab("selected")}>
            選択案件
          </button>
          <button style={tab === "list" ? styles.tabActive : styles.tab} onClick={() => setTab("list")}>
            一覧
          </button>
        </nav>

        <main style={styles.content}>
          {tab === "create" && (
            <section style={styles.cardWithFooter}>
              <div style={styles.cardBody}>
                <h2 style={styles.h2}>{editId ? "案件を編集" : "新規土地を保存"}</h2>

                {editId && (
                  <div style={styles.editNotice}>
                    編集モード：保存すると既存データを更新
                    <button style={styles.cancelEdit} onClick={resetForm}>解除</button>
                  </div>
                )}

                <label style={styles.label}>土地名 / 案件名</label>
                <input style={styles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="例：南アルプス市 候補地A" />

                <label style={styles.label}>状態</label>
                <select style={styles.input} value={status} onChange={e => setStatus(e.target.value)}>
                  <option>調査中</option>
                  <option>有望</option>
                  <option>保留</option>
                  <option>危険</option>
                  <option>候補外</option>
                </select>

                <label style={styles.label}>タグ</label>
                <input style={styles.input} value={tags} onChange={e => setTags(e.target.value)} placeholder="例：分譲 / 接道確認 / 景観 / 農地" />

                <div style={styles.karteGrid}>
                  <div>
                    <label style={styles.label}>接道</label>
                    <select style={styles.input} value={roadAccess} onChange={e => setRoadAccess(e.target.value)}>
                      <option>未確認</option>
                      <option>良好</option>
                      <option>弱い</option>
                      <option>要確認</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>用途地域</label>
                    <select style={styles.input} value={zoning} onChange={e => setZoning(e.target.value)}>
                      <option>未確認</option>
                      <option>住居</option>
                      <option>商業</option>
                      <option>工業</option>
                      <option>調整区域</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>農地</label>
                    <select style={styles.input} value={farmland} onChange={e => setFarmland(e.target.value)}>
                      <option>未確認</option>
                      <option>農地</option>
                      <option>非農地</option>
                      <option>転用要確認</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>ハザード</label>
                    <select style={styles.input} value={hazard} onChange={e => setHazard(e.target.value)}>
                      <option>未確認</option>
                      <option>低</option>
                      <option>中</option>
                      <option>高</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>造成</label>
                    <select style={styles.input} value={grading} onChange={e => setGrading(e.target.value)}>
                      <option>不明</option>
                      <option>低</option>
                      <option>中</option>
                      <option>高</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>インフラ</label>
                    <select style={styles.input} value={infrastructure} onChange={e => setInfrastructure(e.target.value)}>
                      <option>未確認</option>
                      <option>水道</option>
                      <option>下水</option>
                      <option>電気</option>
                      <option>ガス</option>
                    </select>
                  </div>
                </div>

                <div style={styles.sectionTitle}>登記情報</div>

                <div style={styles.karteGrid}>
                  <div>
                    <label style={styles.label}>地番</label>
                    <input style={styles.input} value={parcelNumber} onChange={e => setParcelNumber(e.target.value)} placeholder="例：七沢町123-4" />
                  </div>

                  <div>
                    <label style={styles.label}>登記取得</label>
                    <select style={styles.input} value={registryStatus} onChange={e => setRegistryStatus(e.target.value)}>
                      <option>未取得</option>
                      <option>取得済み</option>
                      <option>要再取得</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>所有者名</label>
                    <input style={styles.input} value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="例：山田 太郎 / 法人名" />
                  </div>

                  <div>
                    <label style={styles.label}>地目</label>
                    <input style={styles.input} value={landCategory} onChange={e => setLandCategory(e.target.value)} placeholder="例：宅地 / 畑 / 山林 / 雑種地" />
                  </div>

                  <div>
                    <label style={styles.label}>地積</label>
                    <input style={styles.input} value={landArea} onChange={e => setLandArea(e.target.value)} placeholder="例：330.57㎡" />
                  </div>

                  <div>
                    <label style={styles.label}>抵当権</label>
                    <select style={styles.input} value={mortgageStatus} onChange={e => setMortgageStatus(e.target.value)}>
                      <option>要確認</option>
                      <option>なし</option>
                      <option>あり</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>登記取得日</label>
                    <input style={styles.input} type="date" value={registryDate} onChange={e => setRegistryDate(e.target.value)} />
                  </div>

                  <div>
                    <label style={styles.label}>登記PDF添付</label>
                    <input style={styles.input} type="file" accept="application/pdf" onChange={e => setRegistryPdf(e.target.files?.[0] || null)} />
                  </div>
                </div>

                <div style={styles.sectionTitle}>謄本読取・権利情報</div>

                <div style={styles.karteGrid}>
                  <div>
                    <label style={styles.label}>家屋番号</label>
                    <input style={styles.input} value={buildingNumber} onChange={e => setBuildingNumber(e.target.value)} placeholder="建物がある場合のみ" />
                  </div>

                  <div>
                    <label style={styles.label}>不動産番号</label>
                    <input style={styles.input} value={realEstateNumber} onChange={e => setRealEstateNumber(e.target.value)} placeholder="登記簿の不動産番号" />
                  </div>

                  <div>
                    <label style={styles.label}>謄本読取</label>
                    <select style={styles.input} value={registryExtractStatus} onChange={e => setRegistryExtractStatus(e.target.value)}>
                      <option>未読取</option>
                      <option>読取済み</option>
                      <option>要確認</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>共同担保</label>
                    <input style={styles.input} value={jointCollateral} onChange={e => setJointCollateral(e.target.value)} placeholder="なし / あり / 目録あり 等" />
                  </div>
                </div>

                <label style={styles.label}>権利部メモ</label>
                <textarea style={styles.textarea} value={rightsMemo} onChange={e => setRightsMemo(e.target.value)} placeholder="所有権、持分、移転原因、受付番号など" />

                <label style={styles.label}>抵当権メモ</label>
                <textarea style={styles.textarea} value={mortgageMemo} onChange={e => setMortgageMemo(e.target.value)} placeholder="抵当権者、極度額、共同担保、抹消要否など" />

                <label style={styles.label}>注意事項</label>
                <textarea style={styles.textarea} value={registryCaution} onChange={e => setRegistryCaution(e.target.value)} placeholder="再取得必要、所有者確認、境界注意、古い謄本など" />

                <label style={styles.label}>謄本抽出メモ</label>
                <textarea style={styles.textarea} value={registryExtractMemo} onChange={e => setRegistryExtractMemo(e.target.value)} placeholder="PDFから読み取った内容の下書き。人間確認後に保存。" />

                <label style={styles.label}>登記メモ</label>
                <textarea style={styles.textarea} value={registryMemo} onChange={e => setRegistryMemo(e.target.value)} placeholder="所有者、抵当権、持分、取得経路、注意点など" />

                <label style={styles.label}>メモ</label>
                <textarea style={styles.textarea} value={memo} onChange={e => setMemo(e.target.value)} placeholder="接道、景観、水路、電柱、造成感、営業メモなど" />

                <label style={styles.label}>現地写真</label>
                {!editId && (
                  <input style={styles.input} type="file" multiple accept="image/*" onChange={e => setImages([...e.target.files])} />
                )}
                {editId && (
                  <input style={styles.input} type="file" multiple accept="image/*" onChange={e => setEditImages([...e.target.files])} />
                )}

                <div style={styles.summary}>
                  <b>自動メモ</b>
                  <p>{summary}</p>
                </div>
              </div>

              <div style={styles.fixedFooter}>
                <button style={styles.primary} onClick={saveSpecimen} disabled={saving}>
                  {saving ? "保存中..." : editId ? "更新する" : "この地点を保存"}
                </button>
              </div>
            </section>
          )}

          {tab === "selected" && (
            <section style={styles.card}>
              <h2 style={styles.h2}>選択案件</h2>

              {!selected && (
                <div style={styles.emptyTall}>
                  <b>案件が選択されていません</b>
                  <p style={styles.emptyText}>
                    一覧カード、または地図上の保存済みPinを選択すると、ここに詳細・編集・PDF操作が表示されます。
                  </p>
                </div>
              )}

              {selected && (
                <>
                  <div style={styles.detailTitle}>{selected.title}</div>
                  <div style={styles.statusLine}>
                    <span style={{ ...styles.status, background: statusColor(selected.status), color: "#fff" }}>
                      {selected.status}
                    </span>
                    <span style={styles.date}>{new Date(selected.createdAt).toLocaleString()}</span>
                  </div>

                  <div style={styles.detailGrid}>
                    <div>
                      <b>Lat</b>
                      <p>{selected.lat}</p>
                    </div>
                    <div>
                      <b>Lng</b>
                      <p>{selected.lng}</p>
                    </div>
                  </div>

                  <div style={styles.block}>
                    <b>タグ</b>
                    <p>{selected.tags || "なし"}</p>
                  </div>

                  <div style={styles.karteView}>
                    <div><b>接道</b><p>{selected.roadAccess || "未確認"}</p></div>
                    <div><b>用途地域</b><p>{selected.zoning || "未確認"}</p></div>
                    <div><b>農地</b><p>{selected.farmland || "未確認"}</p></div>
                    <div><b>ハザード</b><p>{selected.hazard || "未確認"}</p></div>
                    <div><b>造成</b><p>{selected.grading || "不明"}</p></div>
                    <div><b>インフラ</b><p>{selected.infrastructure || "未確認"}</p></div>
                  </div>

                  <div style={styles.sectionTitle}>登記情報</div>

                  <div style={styles.karteView}>
                    <div><b>地番</b><p>{selected.parcelNumber || "未入力"}</p></div>
                    <div><b>登記取得</b><p>{selected.registryStatus || "未取得"}</p></div>
                    <div><b>所有者名</b><p>{selected.ownerName || "未入力"}</p></div>
                    <div><b>地目</b><p>{selected.landCategory || "未入力"}</p></div>
                    <div><b>地積</b><p>{selected.landArea || "未入力"}</p></div>
                    <div><b>抵当権</b><p>{selected.mortgageStatus || "要確認"}</p></div>
                    <div><b>登記取得日</b><p>{selected.registryDate || "未入力"}</p></div>
                    <div>
                      <b>登記PDF</b>
                      <p>
                        {selected.registryPdf?.url ? (
                          <a href={selected.registryPdf.url} target="_blank" rel="noreferrer">PDFを開く</a>
                        ) : "未添付"}
                      </p>
                    </div>
                  </div>

                  <div style={styles.sectionTitle}>謄本読取・権利情報</div>

                  <div style={styles.karteView}>
                    <div><b>家屋番号</b><p>{selected.buildingNumber || "未入力"}</p></div>
                    <div><b>不動産番号</b><p>{selected.realEstateNumber || "未入力"}</p></div>
                    <div><b>謄本読取</b><p>{selected.registryExtractStatus || "未読取"}</p></div>
                    <div><b>共同担保</b><p>{selected.jointCollateral || "なし"}</p></div>
                  </div>

                  <div style={styles.block}>
                    <b>権利部メモ</b>
                    <p>{selected.rightsMemo || "なし"}</p>
                  </div>

                  <div style={styles.block}>
                    <b>抵当権メモ</b>
                    <p>{selected.mortgageMemo || "なし"}</p>
                  </div>

                  <div style={styles.block}>
                    <b>注意事項</b>
                    <p>{selected.registryCaution || "なし"}</p>
                  </div>

                  <div style={styles.block}>
                    <b>謄本抽出メモ</b>
                    <p>{selected.registryExtractMemo || "なし"}</p>
                  </div>

                  <div style={styles.block}>
                    <b>登記メモ</b>
                    <p>{selected.registryMemo || "なし"}</p>
                  </div>

                  <div style={styles.block}>
                    <b>メモ</b>
                    <p>{selected.memo || "なし"}</p>
                  </div>

                  <div style={styles.block}>
                    <b>調査メモ</b>
                    <p>{selected.aiSummary || "なし"}</p>
                  </div>

                  {selected.images?.length > 0 && (
                    <div style={styles.photoGrid}>
                      {selected.images.map(img => (
                        <a key={img.url} href={img.url} target="_blank" rel="noreferrer">
                          <img src={img.url} style={styles.photo} />
                        </a>
                      ))}
                    </div>
                  )}

                  <div style={styles.actionRow4}>
                    <button style={styles.secondary} onClick={() => startEdit(selected)}>編集</button>
                    <button style={styles.secondary} onClick={() => openPdf(selected)}>
                      {pdfBusyId === selected.id ? "生成中..." : "PDFを開く"}
                    </button>
                    <button style={styles.secondary} onClick={() => downloadPdf(selected)}>
                      {pdfBusyId === selected.id ? "生成中..." : "PDF保存"}
                    </button>
                    <button style={styles.danger} onClick={() => deleteItem(selected.id)}>削除</button>
                  </div>
                </>
              )}
            </section>
          )}

          {tab === "list" && (
            <section style={styles.card}>
              <div style={styles.listHead}>
                <h2 style={styles.h2}>保存済み案件</h2>
                <span style={styles.count}>{filteredItems.length}/{items.length}</span>
              </div>

              <input style={styles.input} value={query} onChange={e => setQuery(e.target.value)} placeholder="検索：土地名 / メモ / タグ" />

              <select style={styles.input} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">すべて</option>
                <option>調査中</option>
                <option>有望</option>
                <option>保留</option>
                <option>危険</option>
                <option>候補外</option>
              </select>

              <div style={styles.list}>
                {filteredItems.map(item => (
                  <div key={item.id} style={styles.item} onClick={() => selectItem(item)}>
                    <div style={styles.itemTop}>
                      <b>{item.title}</b>
                      <span style={{ ...styles.status, background: statusColor(item.status), color: "#fff" }}>
                        {item.status}
                      </span>
                    </div>

                    <div style={styles.itemMeta}>
                      {Number(item.lat).toFixed(5)}, {Number(item.lng).toFixed(5)}
                    </div>

                    <p style={styles.itemMemo}>{item.memo || "No memo"}</p>

                    {item.tags && <div style={styles.tag}>{item.tags}</div>}

                    <div style={styles.registryMini}>
                      <span>登記: {item.registryStatus || "未取得"}</span>
                      <span>謄本: {item.registryExtractStatus || "未読取"}</span>
                    </div>

                    <div style={styles.itemButtons4}>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(item); }} style={styles.mini}>編集</button>
                      <button onClick={(e) => { e.stopPropagation(); openPdf(item); }} style={styles.mini}>
                        {pdfBusyId === item.id ? "生成中..." : "開く"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); downloadPdf(item); }} style={styles.mini}>
                        {pdfBusyId === item.id ? "生成中..." : "保存"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} style={styles.miniDanger}>削除</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </aside>
    </div>
  );
}

const styles = {
  app: {
    height: "100vh",
    display: "grid",
    gridTemplateColumns: "minmax(760px, 1fr) 500px",
    background: "#f4f5f7",
    color: "#111",
    fontFamily: "Arial, 'Noto Sans JP', sans-serif",
    overflow: "hidden"
  },
  mapArea: {
    height: "100vh",
    borderRight: "1px solid #ddd",
    position: "relative"
  },
  legend: {
    position: "absolute",
    left: 14,
    bottom: 28,
    zIndex: 1000,
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 10,
    display: "grid",
    gap: 5,
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)"
  },
  dot: {
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: "50%",
    marginRight: 6
  },
  side: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#fafafa"
  },
  header: {
    padding: "18px 20px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e6e6e6"
  },
  logo: {
    margin: 0,
    fontSize: 31,
    letterSpacing: "-1px"
  },
  sub: {
    color: "#666",
    fontSize: 13,
    marginTop: 2
  },
  version: {
    background: "#111",
    color: "#fff",
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 700
  },
  point: {
    padding: 14,
    borderBottom: "1px solid #eee"
  },
  pointTitle: {
    fontWeight: 800,
    fontSize: 13,
    marginBottom: 8
  },
  coords: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    background: "#f0f2f5",
    borderRadius: 12,
    padding: 10,
    fontSize: 12
  },
  empty: {
    background: "#f0f2f5",
    color: "#777",
    padding: 12,
    borderRadius: 12,
    textAlign: "center"
  },
  emptyTall: {
    background: "#f0f2f5",
    color: "#555",
    padding: 34,
    borderRadius: 12,
    textAlign: "center",
    lineHeight: 1.7
  },
  emptyText: {
    margin: "8px 0 0",
    color: "#777",
    fontSize: 13
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    padding: 12,
    borderBottom: "1px solid #eee"
  },
  tab: {
    padding: 10,
    border: "1px solid #ddd",
    borderRadius: 999,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700
  },
  tabActive: {
    padding: 10,
    border: "1px solid #111",
    borderRadius: 999,
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: 14
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e5e5",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 4px 14px rgba(0,0,0,0.04)"
  },
  cardWithFooter: {
    background: "#fff",
    border: "1px solid #e5e5e5",
    borderRadius: 16,
    boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
    overflow: "hidden"
  },
  cardBody: {
    padding: 16,
    paddingBottom: 4
  },
  fixedFooter: {
    position: "sticky",
    bottom: 0,
    background: "#fff",
    borderTop: "1px solid #eee",
    padding: 14
  },
  h2: {
    margin: "0 0 14px",
    fontSize: 18
  },
  editNotice: {
    background: "#eef6ff",
    border: "1px solid #cfe7ff",
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cancelEdit: {
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: 999,
    padding: "5px 10px",
    cursor: "pointer"
  },
  label: {
    display: "block",
    margin: "12px 0 6px",
    fontSize: 12,
    color: "#555",
    fontWeight: 800
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #dcdcdc",
    borderRadius: 12,
    background: "#fff",
    marginBottom: 8
  },
  textarea: {
    width: "100%",
    minHeight: 100,
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #dcdcdc",
    borderRadius: 12,
    resize: "vertical"
  },
  summary: {
    background: "#fbf6ea",
    border: "1px solid #eee0bd",
    borderRadius: 13,
    padding: 12,
    fontSize: 13,
    marginTop: 12,
    lineHeight: 1.6
  },
  primary: {
    width: "100%",
    padding: 13,
    border: 0,
    borderRadius: 12,
    background: "#111",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer"
  },
  secondary: {
    width: "100%",
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 12,
    background: "#f8f8f8",
    color: "#111",
    fontWeight: 800,
    cursor: "pointer"
  },
  danger: {
    width: "100%",
    padding: 12,
    border: "1px solid #f3bcbc",
    borderRadius: 12,
    background: "#fff1f1",
    color: "#a40000",
    fontWeight: 800,
    cursor: "pointer"
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 900,
    marginBottom: 8
  },
  statusLine: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "center"
  },
  status: {
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 11,
    fontWeight: 800
  },
  date: {
    color: "#777",
    fontSize: 11
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
  },
  block: {
    borderTop: "1px solid #eee",
    paddingTop: 12,
    marginTop: 12,
    lineHeight: 1.6
  },
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginTop: 14
  },
  photo: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid #ddd"
  },
  actionRow4: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: 8,
    marginTop: 14
  },
  listHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  count: {
    background: "#eee",
    borderRadius: 999,
    padding: "4px 9px",
    fontSize: 12,
    fontWeight: 800
  },
  list: {
    display: "grid",
    gap: 10,
    marginTop: 8
  },
  item: {
    border: "1px solid #e5e5e5",
    borderRadius: 14,
    padding: 12,
    cursor: "pointer",
    background: "#fff"
  },
  itemTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8
  },
  itemMeta: {
    color: "#777",
    fontSize: 11,
    marginTop: 4
  },
  itemMemo: {
    fontSize: 13,
    color: "#333",
    margin: "8px 0"
  },
  tag: {
    background: "#f3f3f3",
    padding: 7,
    borderRadius: 9,
    fontSize: 12,
    color: "#555"
  },
  itemButtons4: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: 8,
    marginTop: 10
  },
  mini: {
    padding: 8,
    border: "1px solid #ddd",
    borderRadius: 10,
    background: "#f8f8f8",
    cursor: "pointer",
    fontWeight: 700
  },
  miniDanger: {
    padding: 8,
    border: "1px solid #f3bcbc",
    borderRadius: 10,
    background: "#fff1f1",
    color: "#a40000",
    cursor: "pointer",
    fontWeight: 700
  },
  karteGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginTop: 8
  },
  karteView: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    borderTop: "1px solid #eee",
    paddingTop: 12,
    marginTop: 12
  },
  sectionTitle: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1px solid #eee",
    fontSize: 14,
    fontWeight: 900
  },
  registryMini: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    marginTop: 8,
    fontSize: 11,
    color: "#555",
    background: "#f6f6f6",
    borderRadius: 8,
    padding: 7
  }
};



