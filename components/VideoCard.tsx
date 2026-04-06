'use client'

import { useState } from 'react'
import { PlayCircle, Clock, Tag, X } from 'lucide-react'
import type { Class } from '@/lib/types'

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)
  return match?.[1] ?? null
}

function getVimeoId(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match?.[1] ?? null
}

function getEmbedUrl(cls: Class) {
  if (cls.video_type === 'youtube') {
    const id = getYouTubeId(cls.video_url)
    return id ? `https://www.youtube.com/embed/${id}?rel=0` : null
  }
  const id = getVimeoId(cls.video_url)
  return id ? `https://player.vimeo.com/video/${id}` : null
}

function getThumbnail(cls: Class) {
  if (cls.video_type === 'youtube') {
    const id = getYouTubeId(cls.video_url)
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
  }
  return null
}

export default function VideoCard({ cls }: { cls: Class }) {
  const [playing, setPlaying] = useState(false)
  const embedUrl = getEmbedUrl(cls)
  const thumbnail = getThumbnail(cls)

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail / Player */}
      <div className="relative aspect-video bg-slate-900">
        {playing && embedUrl ? (
          <>
            <iframe
              src={`${embedUrl}&autoplay=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button
              onClick={() => setPlaying(false)}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="w-full h-full relative group"
          >
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt={cls.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-800 to-brand-600 flex items-center justify-center">
                <PlayCircle className="w-12 h-12 text-white/60" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <PlayCircle className="w-8 h-8 text-brand-700" />
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-1.5 line-clamp-2">
          {cls.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{cls.description}</p>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          {cls.category && (
            <span className="flex items-center gap-1">
              <Tag size={12} />
              {cls.category}
            </span>
          )}
          {cls.duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {cls.duration_minutes} min
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
