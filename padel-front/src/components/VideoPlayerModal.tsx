interface VideoPlayerModalProps {
  videoUrl: string;
  title: string;
  onClose: () => void;
}

export default function VideoPlayerModal({ videoUrl, title, onClose }: VideoPlayerModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="video-modal" onClick={(e) => e.stopPropagation()}>
        <button className="video-modal-close" onClick={onClose}>✕</button>
        <div className="video-modal-title">{title}</div>
        <video
          src={videoUrl}
          controls
          autoPlay
          playsInline
          className="video-player"
        />
      </div>
    </div>
  );
}
