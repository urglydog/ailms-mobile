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
  playbackRate: number;
  play(): void;
  pause(): void;
}
