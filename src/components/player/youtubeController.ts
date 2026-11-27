import { useEffect, useState } from 'react';
import type { PlayerLike } from '@/types/player';

interface InjectableView {
  injectJavaScript: (script: string) => void;
}

export interface YouTubeHandlers {
  /** Gọi mỗi ~250ms khi video đang phát, kèm thời gian hiện tại (giây). */
  onTime?: (sec: number) => void;
  onEnded?: () => void;
  /** Mã lỗi của YouTube (101/150/153: chủ video không cho nhúng; -1: không nạp được trình phát). */
  onError?: (code: number) => void;
}

const MAX_PENDING = 30;
/** Giữa 2 lần trang gửi thời gian (250ms) ta ước lượng thêm để thời gian chạy mượt; tối đa 1,5s để khi trang đứng thì không chạy tiếp ảo. */
const EXTRAPOLATE_MAX_MS = 1500;

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Bộ điều khiển YouTube cho ứng dụng: nói chuyện với trang IFrame API trong WebView (xem `youtubeHtml.ts`)
 * và tự thoả giao diện `PlayerLike`, nên thanh điều khiển, phụ đề, transcript, giọng lồng tiếng và ghi tiến độ
 * dùng y như với video tải lên. Lệnh gửi trước khi trang sẵn sàng được giữ lại và gửi sau.
 */
export class YouTubeController implements PlayerLike {
  private view: InjectableView | null = null;
  private inited = false;
  private pending: { cmd: string; arg: unknown }[] = [];
  private time = 0;
  private timeAt = 0;
  private dur = 0;
  private fallbackDur = 0;
  private state = -1;
  private desiredRate = 1;
  private isMuted = false;
  private handlers: YouTubeHandlers = {};

  get player(): PlayerLike {
    return this;
  }

  setHandlers(handlers: YouTubeHandlers): void {
    this.handlers = handlers;
  }

  /** Độ dài dự phòng (từ thông tin bài học) cho tới khi trang báo độ dài thật. */
  setFallbackDuration(sec: number): void {
    this.fallbackDur = num(sec, 0);
  }

  /** Gắn/gỡ WebView (dùng làm `ref`). Gỡ thì coi như trang đã mất: lệnh chờ bị bỏ và chờ thông báo `init` mới. */
  readonly setView = (view: InjectableView | null): void => {
    this.view = view;
    if (view === null) {
      this.inited = false;
      this.state = -1;
      this.pending = [];
    }
  };

  /** Nhận chuỗi JSON do trang gửi về. */
  readonly handleMessage = (raw: string): void => {
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof msg !== 'object' || msg === null) return;
    const m = msg as Record<string, unknown>;
    switch (m.type) {
      case 'init': {
        this.inited = true;
        // Trang mới luôn bắt đầu ở tốc độ 1 và có tiếng — áp lại lựa chọn hiện tại của người học.
        if (this.desiredRate !== 1) this.sendRaw('rate', this.desiredRate);
        if (this.isMuted) this.sendRaw('mute', true);
        const queued = this.pending;
        this.pending = [];
        for (const item of queued) this.sendRaw(item.cmd, item.arg);
        break;
      }
      case 'tick': {
        this.time = num(m.t, this.time);
        this.dur = num(m.d, this.dur);
        this.state = num(m.s, this.state);
        this.timeAt = Date.now();
        if (this.state === 1) this.handlers.onTime?.(this.time);
        break;
      }
      case 'state': {
        this.state = num(m.s, this.state);
        if (this.state === 0) this.handlers.onEnded?.();
        break;
      }
      case 'error': {
        this.handlers.onError?.(num(m.c, 0));
        break;
      }
      default:
        break;
    }
  };

  private sendRaw(cmd: string, arg: unknown): void {
    this.view?.injectJavaScript(`window.__cmd(${JSON.stringify(cmd)},${JSON.stringify(arg ?? null)});true;`);
  }

  private send(cmd: string, arg?: unknown): void {
    if (!this.inited || !this.view) {
      this.pending.push({ cmd, arg });
      if (this.pending.length > MAX_PENDING) this.pending.shift();
      return;
    }
    this.sendRaw(cmd, arg);
  }

  // ---- PlayerLike ----

  get currentTime(): number {
    if (this.state === 1) {
      const dt = Date.now() - this.timeAt;
      if (dt >= 0 && dt < EXTRAPOLATE_MAX_MS) return this.time + (dt / 1000) * this.desiredRate;
    }
    return this.time;
  }

  set currentTime(sec: number) {
    const t = Math.max(0, num(sec, 0));
    this.time = t;
    this.timeAt = Date.now();
    this.send('seek', t);
  }

  get duration(): number {
    return this.dur > 0 ? this.dur : this.fallbackDur;
  }

  get playing(): boolean {
    return this.state === 1;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  set muted(value: boolean) {
    if (value === this.isMuted) return;
    this.isMuted = value;
    this.send('mute', value);
  }

  get playbackRate(): number {
    return this.desiredRate;
  }

  set playbackRate(value: number) {
    if (Math.abs(value - this.desiredRate) < 0.001) return;
    this.desiredRate = value;
    this.send('rate', value);
  }

  play(): void {
    this.send('play');
  }

  pause(): void {
    this.send('pause');
  }
}

/** Tạo (một lần) bộ điều khiển YouTube cho màn hình và cập nhật các hàm xử lý sự kiện mỗi khi chúng đổi. */
export function useYouTubeController(handlers: YouTubeHandlers): YouTubeController {
  const [controller] = useState(() => new YouTubeController());
  const { onTime, onEnded, onError } = handlers;
  useEffect(() => {
    controller.setHandlers({ onTime, onEnded, onError });
  }, [controller, onTime, onEnded, onError]);
  return controller;
}
