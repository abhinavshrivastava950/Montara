#!/usr/bin/env python3
"""30-second Afterlight score at 120 BPM.

Picture hits (seconds):
  0.36 glass (After), 0.62 glass (light)
  5.15 whoosh into the lens, 5.23 tick, 5.77 lens cut, ~6.0 Edge
  10.15 plane whoosh from the right, 10.85 park, 11.23 Hold
  15.40 blade, 15.68 slash crack
  21.35 whoosh, 21.47 bars every 0.04s
  25.85 whoosh into the seal, 26.15 trailer hit
  28.40 fade

Delivery: stereo WAV for the picture, plus Dolby Digital AC-3 5.1
(FL FR FC LFE BL BR).
"""

import json
import math
import os
import random
import re
import struct
import subprocess
import wave

SR = 48000
DUR = 30.0
N = int(SR * DUR)
rng = random.Random(120)

FL, FR, FC, LFE, BL, BR = range(6)
CH = [[0.0] * N for _ in range(6)]


def add(ch, i, v):
    if 0 <= i < N:
        CH[ch][i] += v


def kick_at(t0):
    phase = 0.0
    i0 = int(t0 * SR)
    length = int(0.28 * SR)
    for n in range(length):
        t = n / SR
        freq = 140.0 * math.exp(-t * 14.0) + 42.0
        phase += 2.0 * math.pi * freq / SR
        body = math.sin(phase) * math.exp(-t * 8.5)
        click = math.sin(2.0 * math.pi * 1400.0 * t) * math.exp(-t * 180.0)
        add(FC, i0 + n, (body * 0.7 + click * 0.12))
        add(LFE, i0 + n, body * 0.95)
        add(FL, i0 + n, body * 0.18)
        add(FR, i0 + n, body * 0.18)


def glass_at(t0, freq, gain=0.16):
    i0 = int(t0 * SR)
    length = int(1.05 * SR)
    for n in range(length):
        t = n / SR
        env = math.exp(-t * 2.8) * min(1.0, t / 0.005)
        tone = (
            math.sin(2.0 * math.pi * freq * t) * 0.62
            + math.sin(2.0 * math.pi * freq * 2.71 * t) * 0.22
            + math.sin(2.0 * math.pi * freq * 5.18 * t) * 0.08
        )
        v = tone * env * gain
        add(BL, i0 + n, v * 0.75)
        add(BR, i0 + n, v * 0.55)
        add(FC, i0 + n, v * 0.28)
        add(FL, i0 + n, v * 0.12)
        add(FR, i0 + n, v * 0.1)


def tick_at(t0, freq, gain=0.2, pan=0.0):
    i0 = int(t0 * SR)
    length = int(0.07 * SR)
    left = math.sqrt(max(0.0, 1.0 - (pan + 1.0) / 2.0))
    right = math.sqrt(max(0.0, (pan + 1.0) / 2.0))
    for n in range(length):
        t = n / SR
        env = math.exp(-t * 48.0) * min(1.0, t / 0.002)
        v = math.sin(2.0 * math.pi * freq * t) * env * gain
        add(FL, i0 + n, v * left)
        add(FR, i0 + n, v * right)
        add(FC, i0 + n, v * 0.35)


def whoosh(t0, dur, gain, x0, x1, rear0, rear1):
    i0 = int(t0 * SR)
    length = int(dur * SR)
    prev = 0.0
    for n in range(length):
        p = n / max(1, length - 1)
        white = rng.uniform(-1.0, 1.0)
        coef = 0.78 - 0.5 * p
        prev = prev * coef + white * (1.0 - coef)
        hp = white - prev
        env = math.sin(math.pi * p) ** 1.15
        v = hp * env * gain
        x = x0 + (x1 - x0) * p
        rear = rear0 + (rear1 - rear0) * p
        front = 1.0 - rear
        left = math.sqrt(max(0.0, 1.0 - (x + 1.0) / 2.0))
        right = math.sqrt(max(0.0, (x + 1.0) / 2.0))
        add(FL, i0 + n, v * front * left)
        add(FR, i0 + n, v * front * right)
        add(BL, i0 + n, v * rear * left * 1.15)
        add(BR, i0 + n, v * rear * right * 1.15)


def crack_at(t0, gain=0.34):
    i0 = int(t0 * SR)
    length = int(0.12 * SR)
    prev = 0.0
    for n in range(length):
        t = n / SR
        white = rng.uniform(-1.0, 1.0)
        prev = prev * 0.45 + white * 0.55
        hp = white - prev
        env = math.exp(-t * 32.0)
        v = hp * env * gain
        add(FC, i0 + n, v * 0.7)
        add(FL, i0 + n, v * 0.45)
        add(FR, i0 + n, v * 0.45)
        add(LFE, i0 + n, math.sin(2.0 * math.pi * 70.0 * t) * env * gain * 0.5)


def brass_stab(t0, root, gain=0.18):
    i0 = int(t0 * SR)
    length = int(0.55 * SR)
    ratios = (1.0, 1.5, 2.0, 2.52)
    for n in range(length):
        t = n / SR
        env = math.exp(-t * 4.2) * min(1.0, t / 0.01)
        tone = 0.0
        for r in ratios:
            tone += math.sin(2.0 * math.pi * root * r * t) / len(ratios)
        v = tone * env * gain
        add(FC, i0 + n, v)
        add(FL, i0 + n, v * 0.35)
        add(FR, i0 + n, v * 0.35)
        add(LFE, i0 + n, math.sin(2.0 * math.pi * root * t) * env * gain * 0.8)


def thud_at(t0):
    i0 = int(t0 * SR)
    length = int(0.42 * SR)
    phase = 0.0
    for n in range(length):
        t = n / SR
        freq = 78.0 * math.exp(-t * 6.0) + 36.0
        phase += 2.0 * math.pi * freq / SR
        env = math.exp(-t * 7.0) * min(1.0, t / 0.004)
        body = math.sin(phase) * env
        add(LFE, i0 + n, body * 0.9)
        add(FC, i0 + n, body * 0.45)
        add(FL, i0 + n, body * 0.12)
        add(FR, i0 + n, body * 0.12)


def drone(t0, t1, freq, gain):
    i0 = int(t0 * SR)
    i1 = min(N, int(t1 * SR))
    span = max(1, i1 - i0)
    for n in range(span):
        t = n / SR
        env = 1.0
        if t < 0.45:
            env = t / 0.45
        tail = (span / SR) - t
        if tail < 0.5:
            env *= max(0.0, tail / 0.5)
        tone = (
            math.sin(2.0 * math.pi * freq * t) * 0.75
            + math.sin(2.0 * math.pi * freq * 2.0 * t) * 0.12
            + math.sin(2.0 * math.pi * freq * 0.5 * t) * 0.2
        )
        v = tone * env * gain
        add(FC, i0 + n, v * 0.55)
        add(FL, i0 + n, v * 0.22)
        add(FR, i0 + n, v * 0.22)
        add(LFE, i0 + n, math.sin(2.0 * math.pi * freq * t) * env * gain * 0.45)
        add(BL, i0 + n, v * 0.08)
        add(BR, i0 + n, v * 0.08)


def air_bed(gain=0.02):
    prev_l = 0.0
    prev_r = 0.0
    for n in range(N):
        w1 = rng.uniform(-1.0, 1.0)
        w2 = rng.uniform(-1.0, 1.0)
        prev_l = prev_l * 0.94 + w1 * 0.06
        prev_r = prev_r * 0.94 + w2 * 0.06
        hp_l = w1 - prev_l
        hp_r = w2 - prev_r
        add(BL, n, hp_l * gain)
        add(BR, n, hp_r * gain)


def bar_hit(t0, pan):
    tick_at(t0, 520.0 + (pan + 1.0) * 180.0, gain=0.11, pan=pan)
    i0 = int(t0 * SR)
    length = int(0.05 * SR)
    prev = 0.0
    left = math.sqrt(max(0.0, 1.0 - (pan + 1.0) / 2.0))
    right = math.sqrt(max(0.0, (pan + 1.0) / 2.0))
    for n in range(length):
        t = n / SR
        white = rng.uniform(-1.0, 1.0)
        prev = prev * 0.4 + white * 0.6
        env = math.exp(-t * 60.0)
        v = (white - prev) * env * 0.08
        add(FL, i0 + n, v * left)
        add(FR, i0 + n, v * right)


def braam(t0):
    i0 = int(t0 * SR)
    length = int(2.6 * SR)
    partials = (55.0, 82.5, 110.0, 164.8)
    for n in range(length):
        t = n / SR
        env = math.exp(-t * 1.15) * min(1.0, t / 0.012)
        tone = 0.0
        for p in partials:
            tone += math.sin(2.0 * math.pi * p * t * (1.0 - 0.04 * t))
        tone /= len(partials)
        v = tone * env * 0.42
        add(FC, i0 + n, v)
        add(FL, i0 + n, v * 0.42)
        add(FR, i0 + n, v * 0.42)
        add(LFE, i0 + n, math.sin(2.0 * math.pi * 55.0 * t) * env * 0.7)
        add(BL, i0 + n + int(0.09 * SR), v * 0.22)
        add(BR, i0 + n + int(0.09 * SR), v * 0.22)
        add(BL, i0 + n + int(0.18 * SR), v * 0.1)
        add(BR, i0 + n + int(0.18 * SR), v * 0.1)


def riser(t0, t1):
    i0 = int(t0 * SR)
    i1 = int(t1 * SR)
    prev = 0.0
    span = max(1, i1 - i0)
    for n in range(span):
        p = n / span
        white = rng.uniform(-1.0, 1.0)
        coef = 0.9 - 0.55 * p
        prev = prev * coef + white * (1.0 - coef)
        hp = white - prev
        env = (p ** 1.6) * 0.14
        v = hp * env
        add(FL, i0 + n, v * 0.4)
        add(FR, i0 + n, v * 0.4)
        add(BL, i0 + n, v * 0.7)
        add(BR, i0 + n, v * 0.7)
        add(FC, i0 + n, v * 0.2)


def hat_at(t0):
    i0 = int(t0 * SR)
    length = int(0.04 * SR)
    prev = 0.0
    for n in range(length):
        t = n / SR
        white = rng.uniform(-1.0, 1.0)
        prev = prev * 0.3 + white * 0.7
        v = (white - prev) * math.exp(-t * 55.0) * 0.035
        add(BL, i0 + n, v)
        add(BR, i0 + n, v * 0.8)
        add(FL, i0 + n, v * 0.25)
        add(FR, i0 + n, v * 0.3)


def apply_fade():
    fade_from = int(28.4 * SR)
    for i in range(N):
        g = 1.0
        if i < 160:
            g = i / 160.0
        if i >= fade_from:
            g *= max(0.0, 1.0 - (i - fade_from) / (N - fade_from))
        for ch in range(6):
            CH[ch][i] *= g


def write_wav(path, channels):
    with wave.open(path, "w") as wf:
        wf.setnchannels(len(channels))
        wf.setsampwidth(2)
        wf.setframerate(SR)
        frames = bytearray()
        pack = struct.pack
        for i in range(N):
            for buf in channels:
                sample = max(-1.0, min(1.0, buf[i]))
                frames += pack("<h", int(sample * 32767))
        wf.writeframes(frames)


def loudnorm_json(path):
    measured = subprocess.run(
        [
            "ffmpeg", "-y", "-i", path,
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
            "-f", "null", "-",
        ],
        check=True, capture_output=True, text=True,
    )
    blob = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", measured.stderr, re.S)
    return json.loads(blob.group(0))


def main():
    os.makedirs("audio", exist_ok=True)

    # Drones follow the pitch journey and overlap so sections crossfade.
    drone(0.0, 5.45, 55.0, 0.16)
    drone(5.05, 10.45, 65.41, 0.15)
    drone(10.05, 15.7, 73.42, 0.15)
    drone(15.3, 21.6, 82.41, 0.14)
    drone(21.15, 26.05, 98.0, 0.11)
    drone(26.2, 29.3, 55.0, 0.1)

    for t in (0.0, 2.0, 4.0, 6.0, 8.0, 12.0, 14.0, 18.0, 20.0):
        kick_at(t)
    for b in range(40):
        hat_at(0.25 + b * 0.5)

    air_bed(0.018)

    glass_at(0.32, 880.0, 0.15)
    glass_at(0.58, 1174.0, 0.13)
    glass_at(5.2, 740.0, 0.1)

    # Lens / Edge.
    whoosh(5.02, 0.55, 0.26, -0.85, 0.9, 0.75, 0.2)
    tick_at(5.23, 680.0, 0.18, pan=-0.35)
    tick_at(5.77, 980.0, 0.16, pan=-0.2)
    for i, f in enumerate((620.0, 740.0, 880.0, 1040.0)):
        tick_at(5.25 + i * 0.045, f, 0.12, pan=0.45 + i * 0.08)
    brass_stab(6.05, 130.81, 0.12)

    # Brass plane from the right.
    whoosh(10.02, 0.72, 0.3, 0.95, -0.15, 0.35, 0.55)
    brass_stab(10.22, 146.83, 0.2)
    thud_at(10.85)
    for i, f in enumerate((420.0, 510.0, 620.0, 740.0)):
        tick_at(10.43 + i * 0.05, f, 0.1, pan=-0.55)
    thud_at(11.23)

    # Diagonal cut.
    whoosh(15.28, 0.55, 0.28, -0.9, 0.85, 0.6, 0.15)
    crack_at(15.68, 0.4)
    tick_at(15.55, 310.0, 0.14, pan=-0.4)
    tick_at(15.85, 460.0, 0.12, pan=-0.25)

    # Skyline. Bar stagger matches the picture: xD+0.12 then 0.04.
    whoosh(21.22, 0.5, 0.24, -0.7, 0.8, 0.7, 0.25)
    for i in range(14):
        pan = -0.82 + i * (1.64 / 13.0)
        bar_hit(21.47 + i * 0.04, pan)
        if i == 7:
            thud_at(21.47 + i * 0.04)

    riser(23.4, 25.85)
    whoosh(25.72, 0.48, 0.22, -0.4, 0.4, 0.8, 0.1)
    braam(26.15)

    apply_fade()

    peak = 1e-9
    for buf in CH:
        for v in buf:
            peak = max(peak, abs(v))
    scale = 0.78 / peak
    mastered = []
    for buf in CH:
        mastered.append([math.tanh(v * scale * 1.05) for v in buf])

    raw6 = "audio/score-51-raw.wav"
    write_wav(raw6, mastered)

    stats = loudnorm_json(raw6)
    limited6 = "audio/score-51-lim.wav"
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", raw6,
            "-af",
            "loudnorm=I=-14:TP=-2.0:LRA=11:"
            f"measured_I={stats['input_i']}:"
            f"measured_TP={stats['input_tp']}:"
            f"measured_LRA={stats['input_lra']}:"
            f"measured_thresh={stats['input_thresh']}:"
            f"offset={stats['target_offset']}:linear=true,"
            "alimiter=limit=0.7:attack=5:release=50:level=disabled",
            "-ar", "48000",
            "-ac", "6",
            limited6,
        ],
        check=True, capture_output=True,
    )

    ac3 = "audio/score-51.ac3"
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", limited6,
            "-c:a", "ac3",
            "-b:a", "448k",
            "-ac", "6",
            "-channel_layout", "5.1",
            "-dialnorm", "-31",
            ac3,
        ],
        check=True, capture_output=True,
    )

    down = "audio/score-down.wav"
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", limited6,
            "-af",
            "pan=stereo|c0=0.85*c0+0.5*c2+0.55*c4+0.35*c3|c1=0.85*c1+0.5*c2+0.55*c5+0.35*c3",
            "-ar", "48000",
            down,
        ],
        check=True, capture_output=True,
    )
    # The 6-channel master is already near -14. Keep the stereo downmix there.
    # The limiter only catches inter-sample peaks so AAC stays under -1 dBTP.
    dstats = loudnorm_json(down)
    stereo = "audio/score.wav"
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", down,
            "-af",
            "loudnorm=I=-14:TP=-1.5:LRA=11:"
            f"measured_I={dstats['input_i']}:"
            f"measured_TP={dstats['input_tp']}:"
            f"measured_LRA={dstats['input_lra']}:"
            f"measured_thresh={dstats['input_thresh']}:"
            f"offset={dstats['target_offset']}:linear=true,"
            "alimiter=limit=0.76:attack=5:release=40:level=disabled",
            "-ar", "48000",
            stereo,
        ],
        check=True, capture_output=True,
    )
    for tmp in (raw6, limited6, down):
        os.remove(tmp)
    print(f"wrote {stereo} and {ac3} peak_in={peak:.3f} mix_I={stats['input_i']}")


if __name__ == "__main__":
    main()
