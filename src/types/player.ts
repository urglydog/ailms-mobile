/**
 * Phần giao diện tối thiểu của một trình phát mà thanh điều khiển, phụ đề và giọng lồng tiếng cần dùng.
 * `VideoPlayer` của expo-video thoả giao diện này, và bộ điều khiển YouTube (`YouTubeController`) cũng
 * thoả — nên cả hai nguồn video dùng chung một bộ điều khiển/phụ đề/lồng tiếng.
 */
export interface PlayerLike {
  currentTime: number;
  readonly duration: number;
  readonly playing: boolean;
  muted: boolean;
  /** Âm lượng 0–1 (chỉ video tải lên có). Khi nghe giọng lồng tiếng, âm gốc bị tắt cả bằng `muted` lẫn `volume = 0` cho chắc. */
  volume?: number;
  playbackRate: number;
  play(): void;
  pause(): void;
}
