import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Heart, Share2, X } from 'lucide-react';
import { toast } from 'react-toastify';

const CATEGORY_LABELS = ['Pool', 'Room', 'Dining', 'Exterior', 'Spa'];

const mod = (n, m) => ((n % m) + m) % m;

const HotelImageGallery = ({ images = [], isFavorite = false, onToggleFavorite }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const dragStartX = useRef(0);
  const dragLastX = useRef(0);
  const dragStartAt = useRef(0);
  const isDragging = useRef(false);
  const dialogRef = useRef(null);
  const isOpen = lightboxIndex !== null;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button')?.focus();
    const trapFocus = (event) => {
      if (event.key !== 'Tab') return;
      const elements = dialogRef.current?.querySelectorAll('button, a[href]');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', trapFocus);
      previousFocus?.focus();
    };
  }, [isOpen]);

  const shareHotel = async () => {
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Hotel link copied');
      }
    } catch (error) {
      if (error.name !== 'AbortError') toast.info('Copy the address from your browser to share this hotel.');
    }
  };

  const labeledImages = useMemo(() => {
    const validImages = Array.isArray(images) ? images.filter((src) => typeof src === 'string' && src.trim()) : [];
    const safeImages = validImages.length ? validImages : ['/images/hotel-1.jpg'];
    return safeImages.map((src, idx) => ({ src, label: CATEGORY_LABELS[idx % CATEGORY_LABELS.length] }));
  }, [images]);

  const goToPrev = useCallback(() => setActiveIndex((prev) => mod(prev - 1, labeledImages.length)), [labeledImages.length]);
  const goToNext = useCallback(() => setActiveIndex((prev) => mod(prev + 1, labeledImages.length)), [labeledImages.length]);

  const openLightbox = (index) => setLightboxIndex(mod(index, labeledImages.length));
  const closeLightbox = () => setLightboxIndex(null);
  const goLightboxPrev = useCallback(() => setLightboxIndex((prev) => mod((prev ?? 0) - 1, labeledImages.length)), [labeledImages.length]);
  const goLightboxNext = useCallback(() => setLightboxIndex((prev) => mod((prev ?? 0) + 1, labeledImages.length)), [labeledImages.length]);

  const prevImage = labeledImages[mod(activeIndex - 1, labeledImages.length)];
  const currentImage = labeledImages[mod(activeIndex, labeledImages.length)];
  const nextImage = labeledImages[mod(activeIndex + 1, labeledImages.length)];

  const onPointerDown = (event) => {
    dragStartX.current = event.clientX ?? 0;
    dragLastX.current = event.clientX ?? 0;
    dragStartAt.current = Date.now();
    isDragging.current = true;
  };

  const onPointerMove = (event) => {
    if (!isDragging.current) return;
    dragLastX.current = event.clientX ?? dragLastX.current;
  };

  const onPointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const deltaX = dragLastX.current - dragStartX.current;
    const elapsed = Math.max(1, Date.now() - dragStartAt.current);
    const velocity = Math.abs(deltaX / elapsed);
    const shouldMove = Math.abs(deltaX) > 55 || velocity > 0.55;
    if (!shouldMove) return;
    if (lightboxIndex !== null) {
      if (deltaX < 0) goLightboxNext();
      if (deltaX > 0) goLightboxPrev();
      return;
    }
    if (deltaX < 0) goToNext();
    if (deltaX > 0) goToPrev();
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName)) return;
      if (lightboxIndex !== null) {
        if (event.key === 'ArrowLeft') goLightboxPrev();
        if (event.key === 'ArrowRight') goLightboxNext();
        if (event.key === 'Escape') closeLightbox();
        return;
      }
      if (event.key === 'ArrowLeft') goToPrev();
      if (event.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, goLightboxPrev, goLightboxNext, goToPrev, goToNext]);

  return (
    <>
      <div className="w-full rounded-[20px] overflow-hidden relative border border-[rgba(0,191,166,0.15)] shadow-[0_4px_16px_rgba(0,0,0,0.06)] bg-white p-3 md:p-5">
        <div
          className="relative grid grid-cols-[54px_1fr_54px] md:grid-cols-[86px_1fr_86px] gap-2 md:gap-4 items-center"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: 'pan-y' }}
        >
          <button
            type="button"
            aria-label="Previous image"
            onClick={goToPrev}
            className="h-11 w-11 md:h-14 md:w-14 rounded-full border border-[rgba(0,191,166,0.22)] bg-white/90 flex items-center justify-center hover:bg-[#00BFA6] hover:text-white transition z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="relative h-[260px] sm:h-[340px] md:h-[430px] flex items-center justify-center overflow-hidden rounded-2xl">
            <div className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 w-[24%] h-[72%] rounded-xl overflow-hidden opacity-70 scale-[0.85] blur-[3px]">
              <img src={prevImage.src} alt={prevImage.label} className="w-full h-full object-cover" />
              <span className="absolute left-2 bottom-2 px-2 py-1 rounded-full text-[10px] font-semibold text-white bg-white/20 backdrop-blur-[10px] border border-white/40">
                {prevImage.label}
              </span>
            </div>

            <button
              type="button"
              onClick={() => openLightbox(activeIndex)}
              className="gallery-image relative z-10 w-[56%] sm:w-[62%] h-[82%] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,191,166,0.22)] transition-transform duration-500"
              style={{ transform: 'perspective(1100px) rotateY(0deg) scale(1)' }}
            >
              <img src={currentImage.src} alt={currentImage.label} className="w-full h-full object-cover" />
              <span className="absolute left-3 bottom-3 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-white/20 backdrop-blur-[10px] border border-white/45">
                {currentImage.label}
              </span>
            </button>

            <div className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 w-[24%] h-[72%] rounded-xl overflow-hidden opacity-70 scale-[0.85] blur-[3px]">
              <img src={nextImage.src} alt={nextImage.label} className="w-full h-full object-cover" />
              <span className="absolute left-2 bottom-2 px-2 py-1 rounded-full text-[10px] font-semibold text-white bg-white/20 backdrop-blur-[10px] border border-white/40">
                {nextImage.label}
              </span>
            </div>
          </div>

          <button
            type="button"
            aria-label="Next image"
            onClick={goToNext}
            className="h-11 w-11 md:h-14 md:w-14 rounded-full border border-[rgba(0,191,166,0.22)] bg-white/90 flex items-center justify-center hover:bg-[#00BFA6] hover:text-white transition z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute right-3 top-3 md:right-5 md:top-5 flex items-center gap-2">
            <button
              type="button"
              aria-label="Save hotel"
              aria-pressed={isFavorite}
              onClick={onToggleFavorite}
              className={`h-10 w-10 rounded-full border border-white/40 backdrop-blur-[12px] flex items-center justify-center transition ${
                isFavorite ? 'bg-white text-rose-500 animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              aria-label="Share hotel"
              onClick={shareHotel}
              className="h-10 w-10 rounded-full border border-white/40 bg-white/20 text-white backdrop-blur-[12px] flex items-center justify-center hover:bg-white/30 transition"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          {labeledImages.map((_, idx) => (
            <button
              key={`dot-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to image ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === activeIndex ? 'w-6 bg-[#00BFA6]' : 'w-2.5 bg-[#B0BEC5]'
              }`}
            />
          ))}
        </div>

        <p className="text-center text-xs sm:text-sm mt-3 font-medium text-[#546E7A]">──── drag to explore ────</p>

        <button type="button" onClick={() => openLightbox(activeIndex)} className="view-all-btn absolute bottom-4 right-4">
          View all {labeledImages.length} photos
        </button>
      </div>

      {lightboxIndex !== null && (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Hotel photo gallery" className="fixed inset-0 z-[160] bg-black/95 flex flex-col">
          <div className="h-16 px-4 md:px-8 flex items-center justify-between text-white/95">
            <button
              type="button"
              aria-label="Close gallery"
              onClick={closeLightbox}
              className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-sm md:text-base font-semibold">{lightboxIndex + 1} of {labeledImages.length}</p>
            <a
              href={labeledImages[mod(lightboxIndex, labeledImages.length)].src}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="h-10 px-4 rounded-full bg-white/15 inline-flex items-center gap-2 text-sm font-semibold hover:bg-white/25"
            >
              <Download className="h-4 w-4" /> Save
            </a>
          </div>

          <div
            className="flex-1 relative flex items-center justify-center px-3 md:px-10"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ touchAction: 'pan-y' }}
          >
            <button
              type="button"
              aria-label="Previous photo"
              onClick={goLightboxPrev}
              className="absolute left-3 md:left-6 h-11 w-11 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div className="text-center">
              <img
                src={labeledImages[mod(lightboxIndex, labeledImages.length)].src}
                alt={labeledImages[mod(lightboxIndex, labeledImages.length)].label}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl transition-opacity duration-300"
              />
              <p className="mt-4 text-white/90 text-sm md:text-base font-semibold">{labeledImages[mod(lightboxIndex, labeledImages.length)].label}</p>
            </div>

            <button
              type="button"
              aria-label="Next photo"
              onClick={goLightboxNext}
              className="absolute right-3 md:right-6 h-11 w-11 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div className="h-24 md:h-28 px-3 md:px-8 pb-4 flex items-center justify-center">
            <div className="max-w-full overflow-x-auto flex items-center gap-2 md:gap-3">
              {labeledImages.map((img, idx) => (
                <button
                  key={`thumb-${idx}`}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={`h-14 w-16 md:h-[70px] md:w-[74px] overflow-hidden rounded-lg border transition ${
                    lightboxIndex === idx ? 'opacity-100 border-[#00E5CC]' : 'opacity-50 border-white/20'
                  }`}
                >
                  <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .gallery-image {
          cursor: pointer;
          overflow: hidden;
        }
        .gallery-image img {
          transition: transform 0.6s ease;
        }
        .gallery-image:hover img {
          transform: scale(1.04);
        }
        .gallery-image::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 40, 35, 0.5) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .gallery-image:hover::after {
          opacity: 1;
        }
        .view-all-btn {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          border: 1.5px solid rgba(0,191,166,0.3);
          color: #263238;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 10px 22px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transition: all 0.25s ease;
        }
        .view-all-btn:hover {
          background: #00BFA6;
          color: #FFFFFF;
          border-color: #00BFA6;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,191,166,0.3);
        }
      `}</style>
    </>
  );
};

export default HotelImageGallery;
