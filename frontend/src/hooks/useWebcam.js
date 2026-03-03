import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Manages a getUserMedia webcam stream tied to a <video> element.
 * Automatically stops the stream on component unmount.
 */
export function useWebcam() {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const [active, setActive] = useState(false)
  const [error,  setError]  = useState(null)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setActive(true)
      setError(null)
    } catch {
      setError('Camera access denied. Please allow camera permissions.')
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }, [])

  // Auto-cleanup on unmount
  useEffect(() => () => stop(), [stop])

  return { videoRef, active, error, start, stop }
}

/**
 * Captures the current video frame as a JPEG Blob.
 */
export function captureFrame(videoEl) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width  = videoEl.videoWidth  || 640
    canvas.height = videoEl.videoHeight || 480
    canvas.getContext('2d').drawImage(videoEl, 0, 0)
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  })
}
