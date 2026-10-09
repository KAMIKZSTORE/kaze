import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Clipboard, CloudUpload, FileImage, Film, LoaderCircle, X } from 'lucide-react'

type MediaInfo = { code: string; mimetype: string; url: string }

const maximumSize = 400 * 1024 * 1024

function App() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [media, setMedia] = useState<MediaInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [missing, setMissing] = useState(false)
  const [mediaCode, setMediaCode] = useState(() => window.location.pathname.slice(1))
  const isMediaPage = /^(?:[a-z0-9]{6}|[a-f0-9]{8}|[a-f0-9]{24})$/i.test(mediaCode)

  useEffect(() => {
    function handlePopState() {
      setMediaCode(window.location.pathname.slice(1))
      setMedia(null)
      setMissing(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!isMediaPage) return
    let cancelled = false
    setMissing(false)
    fetch(`/api/media/${mediaCode}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Media tidak ditemukan.')
        return await response.json() as MediaInfo
      })
      .then((loadedMedia) => {
        if (!cancelled) setMedia(loadedMedia)
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    return () => { cancelled = true }
  }, [isMediaPage, mediaCode])

  function chooseFile(selected?: File) {
    if (!selected) return
    setError('')
    setMedia(null)
    if (!selected.type.startsWith('video/') && !selected.type.startsWith('image/')) {
      setError('Pilih file gambar atau video.')
      return
    }
    if (selected.size > maximumSize) {
      setError('Ukuran file maksimal 400 MB.')
      return
    }
    setFile(selected)
  }

  async function upload() {
    if (!file) return
    setBusy(true)
    setError('')
    const body = new FormData()
    body.append('file', file)
    try {
      const response = await fetch('/api/upload', { method: 'POST', body })
      const result = await response.json() as { error?: string; code?: string }
      if (!response.ok || !result.code) throw new Error(result.error || 'Unggah gagal. Coba lagi.')
      window.history.pushState({}, '', `/${result.code}`)
      setMediaCode(result.code)
      setFile(null)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unggah gagal. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink(value = window.location.href) {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (isMediaPage) {
    return <main className="player-page">
      <header className="player-topbar">
        <a className="back-button" href="/" onClick={(event) => { event.preventDefault(); window.history.pushState({}, '', '/'); setMediaCode(''); setMedia(null); setMissing(false) }}><ArrowLeft size={17} /> Kembali</a>
        <a className="wordmark player-brand" href="/">KAZE99 <span>ID</span></a>
        <button className="copy-button" onClick={() => copyLink()}>{copied ? <Check size={17} /> : <Clipboard size={17} />} {copied ? 'Tersalin' : 'Salin link'}</button>
      </header>
      {media ? <div className="player-wrap">
        {media.mimetype.startsWith('video/')
          ? <video className="player" src={media.url} controls playsInline />
          : <img className="player image-player" src={media.url} alt="Media yang dibagikan" />}
      </div> : missing ? <div className="media-message"><strong>Media tidak ditemukan</strong><a href="/">Kembali ke halaman utama</a></div> : <p className="loading"><LoaderCircle className="spin" /> Memuat media...</p>}
    </main>
  }

  return <main className="home">
    <header className="topbar"><a className="wordmark" href="/">KAZE99 <span>ID</span></a><span className="top-note">MEDIA JADI LINK, TANPA RIBET</span></header>
    <section className="upload-section">
      <div className="eyebrow"><span className="live-dot" /> BERBAGI TANPA RIBET</div>
      <h1>Media kamu.<br /><span>Langsung jadi URL.</span></h1>
      <p className="intro">Mau upload media jadi URL tanpa ribet? Pilih file, unggah, lalu langsung bagikan link-nya.</p>
      <div className={`dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]) }}>
        <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/gif,image/webp" hidden onChange={(event) => chooseFile(event.target.files?.[0])} />
        <div className="upload-icon"><CloudUpload size={26} strokeWidth={1.7} /></div>
        <strong>Tarik file ke sini</strong>
        <span className="drop-note">atau pilih dari perangkat</span>
        <button className="choose-button" onClick={() => fileInput.current?.click()}>Pilih file <span>↗</span></button>
        <div className="format-note"><span><Film size={13} /> VIDEO</span><span><FileImage size={13} /> GAMBAR</span><i /> MAKS. 400 MB</div>
      </div>
      {file && <div className="selected-file"><span className="file-name">{file.name}<small>{(file.size / (1024 * 1024)).toFixed(1)} MB</small></span><button className="icon-button" onClick={() => setFile(null)} aria-label="Hapus file"><X size={18} /></button></div>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {file && <button className="upload-button" onClick={upload} disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Mengunggah...</> : <><CloudUpload size={17} /> Unggah & buat tautan</>}</button>}
      {media && <div className="result">
        <div className="result-title"><Check size={17} /> Tautan siap dibagikan</div>
        <div className="link-field"><a href={`/${media.code}`} target="_blank" rel="noreferrer">{window.location.origin}/{media.code}</a><button onClick={() => copyLink(`${window.location.origin}/${media.code}`)} aria-label="Salin tautan">{copied ? <Check size={17} /> : <Clipboard size={17} />}</button></div>
        <a className="open-link" href={`/${media.code}`} target="_blank" rel="noreferrer">Buka media <span>↗</span></a>
      </div>}
    </section>
    <footer><span>KAZE99 ID</span><span>File hingga 400 MB. Jangan unggah file sensitif.</span></footer>
  </main>
}

export default App