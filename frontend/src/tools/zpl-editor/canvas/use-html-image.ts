// data URL → HTMLImageElement 로더 훅(Konva Image 는 로드 완료된 이미지 객체를 요구한다).
import { useEffect, useState } from 'react'

export function useHtmlImage(src?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) {
      setImg(null)
      return
    }
    let live = true
    const im = new Image()
    im.onload = () => {
      if (live) setImg(im)
    }
    im.src = src
    return () => {
      live = false
    }
  }, [src])
  return img
}
