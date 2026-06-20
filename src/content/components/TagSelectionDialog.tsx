import type { VideoMetadata, VideoTag } from '@core/types';

interface TagSelectionDialogProps {
  metadata: VideoMetadata;
  onSelect: (tag: VideoTag | null) => void;
}

export function TagSelectionDialog({ metadata, onSelect }: TagSelectionDialogProps) {
  return (
    <div
      className="bfm-tag-dialog"
      role="dialog"
      aria-label="选择视频类型"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      <div className="bfm-tag-dialog__content">
        <h3 className="bfm-tag-dialog__title">选择视频类型</h3>
        <p className="bfm-tag-dialog__video-title">{metadata.title}</p>
        <div className="bfm-tag-dialog__buttons">
          <button
            className="bfm-tag-btn bfm-tag-btn--learning"
            onClick={() => onSelect('LEARNING')}
          >
            📚 学习
          </button>
          <button
            className="bfm-tag-btn bfm-tag-btn--music"
            onClick={() => onSelect('MUSIC')}
          >
            🎵 音乐
          </button>
          <button
            className="bfm-tag-btn bfm-tag-btn--entertainment"
            onClick={() => onSelect('ENTERTAINMENT')}
          >
            🎮 娱乐
          </button>
        </div>
        <button
          className="bfm-tag-btn bfm-tag-btn--cancel"
          onClick={() => onSelect(null)}
        >
          取消
        </button>
      </div>
    </div>
  );
}
