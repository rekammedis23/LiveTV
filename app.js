const M3U_URL = "https://iptv-org.github.io/iptv/index.m3u";
let daftarSaluran = [];
let saluranTerpilih = null;
let pemutarHls = null;

// Muat daftar saluran saat halaman siap
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(M3U_URL);
    const teks = await res.text();
    daftarSaluran = uraiM3U(teks);
    tampilkanDaftar(daftarSaluran);
  } catch (err) {
    document.getElementById("channelList").innerHTML = 
      `<li style="color:red">Gagal memuat data: ${err.message}</li>`;
  }

  pasangPenyaring();
  pasangTombolBagikan();
  pasangBeralihTema();
});

// Mengurai format daftar putar M3U
function uraiM3U(teks) {
  const baris = teks.split("\n");
  const saluran = [];
  let info = {};

  for (const b of baris) {
    if (b.startsWith("#EXTINF")) {
      const nama = b.split(",").slice(1).join(",").trim();
      const negara = b.match(/country="([^"]+)"/)?.[1] || "";
      const kategori = b.match(/group-title="([^"]+)"/)?.[1] || "";
      info = { nama, negara, kategori };
    } else if (b.startsWith("http") && !b.startsWith("#")) {
      saluran.push({ ...info, url: b.trim(), id: btoa(info.nama || b).slice(0, 12) });
      info = {};
    }
  }
  return saluran;
}

function tampilkanDaftar(saluran) {
  const el = document.getElementById("channelList");
  el.innerHTML = saluran.map(s => `
    <li data-url="${s.url}" data-nama="${s.nama}" data-negara="${s.negara}" data-kategori="${s.kategori}">
      ${s.nama}
      ${s.negara ? `<small style="opacity:0.6"> (${s.negara})</small>` : ""}
    </li>
  `).join("");

  el.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", () => pilihSaluran(li.dataset));
  });
}

function pilihSaluran(data) {
  saluranTerpilih = data;
  
  document.querySelectorAll(".channel-list li").forEach(l => l.classList.remove("terpilih"));
  event.target.closest("li").classList.add("terpilih");

  document.getElementById("chName").textContent = data.nama;
  document.getElementById("chMeta").textContent = `${data.negara || "—"} · ${data.kategori || "Umum"}`;

  putarSaluran(data.url);
  perbaruiTautanBagikan();
  perbaruiKodeSematkan();
}

function putarSaluran(url) {
  const video = document.getElementById("player");
  document.getElementById("playerStatus").textContent = "Sedang memuat aliran...";

  if (pemutarHls) pemutarHls.destroy();
  if (Hls.isSupported()) {
    pemutarHls = new Hls();
    pemutarHls.loadSource(url);
    pemutarHls.attachMedia(video);
    pemutarHls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
      document.getElementById("playerStatus").textContent = "";
    });
    pemutarHls.on(Hls.Events.ERROR, (e, d) => {
      if (d.fatal) document.getElementById("playerStatus").textContent = "⚠️ Aliran tidak dapat diputar";
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    video.play().catch(() => {});
  }
}

function pasangPenyaring() {
  const cari = () => {
    const kata = document.getElementById("searchInput").value.toLowerCase();
    const neg = document.getElementById("filterCountry").value;
    const kat = document.getElementById("filterCategory").value;

    const tersaring = daftarSaluran.filter(s =>
      s.nama.toLowerCase().includes(kata) &&
      (!neg || s.negara === neg) &&
      (!kat || s.kategori?.toLowerCase() === kat)
    );
    tampilkanDaftar(tersaring);
  };

  document.getElementById("searchInput").addEventListener("input", cari);
  document.getElementById("filterCountry").addEventListener("change", cari);
  document.getElementById("filterCategory").addEventListener("change", cari);
}

function pasangBeralihTema() {
  const tombol = document.getElementById("toggleMode");
  const terapkan = () => {
    const gelap = document.body.classList.toggle("gelap");
    tombol.textContent = gelap ? "☀️ Mode Terang" : "🌙 Mode Gelap";
    localStorage.setItem("tema", gelap ? "gelap" : "terang");
  };
  if (localStorage.getItem("tema") === "gelap") terapkan();
  tombol.addEventListener("click", terapkan);
}

function perbaruiTautanBagikan() {
  if (!saluranTerpilih) return;
  const tautan = `${window.location.origin}${window.location.pathname}?ch=${encodeURIComponent(saluranTerpilih.nama)}&url=${encodeURIComponent(saluranTerpilih.url)}`;
  const pesan = `Tonton ${saluranTerpilih.nama} lewat IPTV: ${tautan}`;
  
  document.getElementById("shareWA").href = `https://wa.me/?text=${encodeURIComponent(pesan)}`;
  document.getElementById("shareTG").href = `https://t.me/share/url?url=${encodeURIComponent(tautan)}&text=${encodeURIComponent("Tonton saluran ini!")}`;
  document.getElementById("shareFB").href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tautan)}`;
  
  document.getElementById("copyLinkBtn").onclick = () => 
    navigator.clipboard.writeText(tautan).then(() => alert("Tautan disalin!"));
}

function perbaruiKodeSematkan() {
  if (!saluranTerpilih) return;
  const tautan = `${window.location.origin}${window.location.pathname}embed.html?url=${encodeURIComponent(saluranTerpilih.url)}&nama=${encodeURIComponent(saluranTerpilih.nama)}`;
  const kode = `<iframe src="${tautan}" width="100%" height="450" frameborder="0" allowfullscreen allow="autoplay"></iframe>`;
  document.getElementById("embedCode").value = kode;
}

function pasangTombolBagikan() {
  document.getElementById("shareBtn").onclick = () => {
    document.getElementById("shareBox").classList.toggle("hidden");
    document.getElementById("embedBox").classList.add("hidden");
  };
  document.getElementById("embedBtn").onclick = () => {
    document.getElementById("embedBox").classList.toggle("hidden");
    document.getElementById("shareBox").classList.add("hidden");
  };
  document.getElementById("copyEmbed").onclick = () => 
    navigator.clipboard.writeText(document.getElementById("embedCode").value).then(() => alert("Kode disalin!"));
  document.getElementById("copyM3uBtn").onclick = () => {
    if (saluranTerpilih) navigator.clipboard.writeText(saluranTerpilih.url).then(() => alert("Tautan M3U disalin!"));
  };
}

// Baca parameter dari URL untuk bagikan langsung
window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  const url = params.get("url"), nama = params.get("ch");
  if (url && nama) pilihSaluran({ url, nama, negara: "", kategori: "" });
});
