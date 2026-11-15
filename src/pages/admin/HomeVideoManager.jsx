// Home hero background video — one current video (the most recently updated home_video row).
// Upload/replace an MP4 or WebM (videos bucket), an optional poster image (images bucket),
// toggle it on/off, or remove it. Replaced or removed files are deleted from storage.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import ConfirmDialog from './ConfirmDialog'
import Toast from './Toast'

const VIDEO_TYPES = ['video/mp4', 'video/webm']
const MAX_VIDEO_MB = 50
const MAX_POSTER_MB = 10
const TIP = 'Use a silent 8–15 s clip, 720p, under 8 MB.'

// Storage path of a public URL in the given bucket, or null if it isn't one of ours.
function storagePath(url, bucket) {
  const parts = url?.split(`/object/public/${bucket}/`)
  return parts?.length === 2 ? decodeURIComponent(parts[1]) : null
}

async function uploadTo(bucket, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `home-video/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

async function removeFile(url, bucket) {
  const path = storagePath(url, bucket)
  if (path) await supabase.storage.from(bucket).remove([path])
}

export default function HomeVideoManager() {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [videoFile, setVideoFile] = useState(null)
  const [posterFile, setPosterFile] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)   // 'video' | 'poster' | null
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // State is only set after the query resolves, so loading on mount doesn't
  // trigger react-hooks/set-state-in-effect.
  const fetchRow = useCallback(() =>
    supabase
      .from('home_video')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .then(({ data, error: err }) => {
        if (err) setError('Could not load the current video: ' + err.message)
        setRow(data?.[0] ?? null)
        setLoading(false)
      })
  , [])

  useEffect(() => { fetchRow() }, [fetchRow])

  function pickVideo(e) {
    const f = e.target.files[0] ?? null
    setError(null)
    if (!f) { setVideoFile(null); return }
    if (!VIDEO_TYPES.includes(f.type)) {
      setVideoFile(null); e.target.value = ''
      setError(`"${f.name}" is not an MP4 or WebM video. ${TIP}`)
      return
    }
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      setVideoFile(null); e.target.value = ''
      setError(`"${f.name}" is ${(f.size / 1048576).toFixed(1)} MB — the limit is ${MAX_VIDEO_MB} MB. ${TIP}`)
      return
    }
    setVideoFile(f)
  }

  function pickPoster(e) {
    const f = e.target.files[0] ?? null
    setError(null)
    if (!f) { setPosterFile(null); return }
    if (!f.type.startsWith('image/')) {
      setPosterFile(null); e.target.value = ''
      setError(`"${f.name}" is not an image.`)
      return
    }
    if (f.size > MAX_POSTER_MB * 1024 * 1024) {
      setPosterFile(null); e.target.value = ''
      setError(`The poster image is ${(f.size / 1048576).toFixed(1)} MB — the limit is ${MAX_POSTER_MB} MB.`)
      return
    }
    setPosterFile(f)
  }

  function resetInputs() {
    setVideoFile(null)
    setPosterFile(null)
    for (const id of ['hv-video', 'hv-poster']) {
      const input = document.getElementById(id)
      if (input) input.value = ''
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!row && !videoFile) { setError(`Choose a video to upload. ${TIP}`); return }
    if (!videoFile && !posterFile) { setError('Choose a new video or poster to upload.'); return }
    setSaving(true)
    setError(null)
    try {
      const videoUrl = videoFile ? await uploadTo('videos', videoFile) : row.video_url
      const posterUrl = posterFile ? await uploadTo('images', posterFile) : (row?.poster_url ?? null)
      const payload = { video_url: videoUrl, poster_url: posterUrl, updated_at: new Date().toISOString() }

      const { error: dbErr } = row
        ? await supabase.from('home_video').update(payload).eq('id', row.id)
        : await supabase.from('home_video').insert({ ...payload, is_active: true })
      if (dbErr) throw dbErr

      // The row now points at the new files; remove the ones they replaced.
      if (row && videoFile) await removeFile(row.video_url, 'videos')
      if (row?.poster_url && posterFile) await removeFile(row.poster_url, 'images')

      resetInputs()
      await fetchRow()
      showToast(row ? 'Home video updated.' : 'Home video added.')
    } catch (err) {
      setError(err.message ?? 'Upload failed.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive() {
    const { error: err } = await supabase
      .from('home_video')
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (err) { showToast('Update failed: ' + err.message, 'error'); return }
    await fetchRow()
    showToast(row.is_active ? 'Video turned off — the home page shows the normal banner.' : 'Video turned on.')
  }

  async function handleRemove() {
    const what = confirm
    setConfirm(null)
    if (!row) return
    if (what === 'poster') {
      const { error: err } = await supabase.from('home_video').update({ poster_url: null, updated_at: new Date().toISOString() }).eq('id', row.id)
      if (err) { showToast('Remove failed: ' + err.message, 'error'); return }
      await removeFile(row.poster_url, 'images')
      await fetchRow()
      showToast('Poster removed.')
      return
    }
    const { error: err } = await supabase.from('home_video').delete().eq('id', row.id)
    if (err) { showToast('Remove failed: ' + err.message, 'error'); return }
    await removeFile(row.video_url, 'videos')
    if (row.poster_url) await removeFile(row.poster_url, 'images')
    await fetchRow()
    showToast('Home video removed — the home page shows the normal banner.')
  }

  return (
    <div>
      <div className="adm-manager-bar">
        <div>
          <h1>Home Video</h1>
          <p>Background video for the home page banner. {TIP}</p>
        </div>
      </div>

      {/* Current video */}
      <div className="adm-table-card" style={{ marginBottom: '24px', padding: '20px' }}>
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" />Loading…</div>
        ) : !row ? (
          <div className="adm-empty">
            <div className="adm-empty-icon">🎬</div>
            <div className="adm-empty-title">No home video yet</div>
            <div className="adm-empty-sub">The home page shows the normal banner. Upload a video below to add one.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
            <video
              src={row.video_url}
              poster={row.poster_url ?? undefined}
              muted
              loop
              playsInline
              controls
              preload="metadata"
              style={{ width: '320px', maxWidth: '100%', aspectRatio: '16 / 9', objectFit: 'cover', background: '#000', borderRadius: '8px' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
              <span className={`adm-badge ${row.is_active ? 'adm-badge-green' : 'adm-badge-gray'}`} style={{ alignSelf: 'flex-start' }}>
                {row.is_active ? 'On — showing on the home page' : 'Off — home page shows the normal banner'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>
                Poster: {row.poster_url ? 'set' : 'none'} · Updated {new Date(row.updated_at).toLocaleString()}
              </span>
              <div className="adm-actions" style={{ flexWrap: 'wrap' }}>
                <button className="adm-btn adm-btn-secondary" onClick={toggleActive}>
                  {row.is_active ? 'Turn off' : 'Turn on'}
                </button>
                {row.poster_url && (
                  <button className="adm-btn adm-btn-ghost" onClick={() => setConfirm('poster')}>Remove poster</button>
                )}
                <button className="adm-btn adm-btn-danger-ghost" onClick={() => setConfirm('video')}>Remove video</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload / replace */}
      <div className="adm-table-card">
        <form className="adm-form" onSubmit={handleSave} noValidate style={{ maxWidth: '560px' }}>
          <h2 style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '6px', color: 'var(--adm-text)' }}>
            {row ? 'Replace video or poster' : 'Upload a video'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', marginBottom: '14px' }}>
            MP4 or WebM, up to {MAX_VIDEO_MB} MB. Tip: {TIP} It plays muted and loops behind the headline.
          </p>

          {error && <div className="adm-form-err" style={{ marginBottom: '12px' }}>⚠ {error}</div>}

          <div className="adm-form-row">
            <div className="adm-field">
              <label>Video (MP4 / WebM)</label>
              <label className="adm-file-label" style={{ display: 'flex' }}>
                {videoFile ? `${videoFile.name} (${(videoFile.size / 1048576).toFixed(1)} MB)` : (row ? 'Choose replacement video' : 'Choose video')}
                <input id="hv-video" type="file" accept="video/mp4,video/webm" onChange={pickVideo} />
              </label>
            </div>
            <div className="adm-field">
              <label>Poster image (optional)</label>
              <label className="adm-file-label" style={{ display: 'flex' }}>
                {posterFile ? posterFile.name : (row?.poster_url ? 'Choose replacement poster' : 'Choose poster')}
                <input id="hv-poster" type="file" accept="image/*" onChange={pickPoster} />
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                Shown instead of the video for visitors who turn off motion or are saving data.
              </span>
            </div>
          </div>

          <button className="adm-btn adm-btn-primary" type="submit" disabled={saving}>
            {saving ? 'Uploading…' : row ? 'Save' : 'Upload'}
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={handleRemove}
        title={confirm === 'poster' ? 'Remove the poster image?' : 'Remove the home video?'}
        message={confirm === 'poster'
          ? 'The video stays; visitors who don\'t get the video will see the normal banner.'
          : 'The home page goes back to the normal banner and the video file is deleted. This cannot be undone.'}
      />

      <Toast toast={toast} />
    </div>
  )
}
