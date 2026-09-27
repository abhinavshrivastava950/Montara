#!/usr/bin/env python3
"""Deterministic 15-second reel score at 128 BPM. No samples, no network."""

import json
import math
import os
import random
import re
import struct
import subprocess
import wave

SR = 48000
DUR = 15.0
BPM = 128.0
BEAT = 60.0 / BPM
N = int(SR * DUR)
rng = random.Random(128)

kick_g = [0.0] * N
clap_g = [0.0] * N
hat_g = [0.0] * N
bass_g = [0.0] * N
fx_g = [0.0] * N
kick_env = [0.0] * N


def add(buf, i, v):
    if 0 <= i < N:
        buf[i] += v


def kick_at(t0):
    phase = 0.0
    i0 = int(t0 * SR)
    length = int(0.22 * SR)
    for n in range(length):
        t = n / SR
        freq = 168.0 * math.exp(-t * 20.0) + 46.0
        phase += 2.0 * math.pi * freq / SR
        body = math.sin(phase) * math.exp(-t * 12.5)
        click = math.sin(2.0 * math.pi * 1850.0 * t) * math.exp(-t * 220.0)
        env = body * 0.92 + click * 0.28
        add(kick_g, i0 + n, env)
        if 0 <= i0 + n < N:
            kick_env[i0 + n] = max(kick_env[i0 + n], math.exp(-t * 16.0))


def clap_at(t0):
    i0 = int(t0 * SR)
    bursts = (0.0, 0.011, 0.023)
    for delay in bursts:
        start = i0 + int(delay * SR)
        length = int(0.12 * SR)
        prev = 0.0
        for n in range(length):
            t = n / SR
            white = rng.uniform(-1.0, 1.0)
            prev = prev * 0.72 + white * 0.28
            hp = white - prev
            env = math.exp(-t * 28.0) * (0.55 if delay == 0.0 else 0.28)
            add(clap_g, start + n, hp * env * 0.7)
            add(clap_g, start + n + int(0.012 * SR), hp * env * 0.35)


def hat_at(t0, open_hat=False):
    i0 = int(t0 * SR)
    decay = 9.0 if open_hat else 48.0
    length = int((0.18 if open_hat else 0.045) * SR)
    prev = 0.0
    gain = 0.16 if open_hat else 0.09
    for n in range(length):
        t = n / SR
        white = rng.uniform(-1.0, 1.0)
        prev = prev * 0.35 + white * 0.65
        hp = white - prev
        add(hat_g, i0 + n, hp * math.exp(-t * decay) * gain)


def bass_at(t0, freq, dur=0.42, gain=0.34):
    i0 = int(t0 * SR)
    length = int(dur * SR)
    for n in range(length):
        t = n / SR
        env = math.exp(-t * (2.2 if dur > 0.5 else 4.4))
        # soft attack
        env *= min(1.0, t / 0.008)
        tone = math.sin(2.0 * math.pi * freq * t)
        fifth = math.sin(2.0 * math.pi * freq * 2.0 * t) * 0.18
        add(bass_g, i0 + n, (tone + fifth) * env * gain)


def tick_at(t0, freq=920.0):
    i0 = int(t0 * SR)
    length = int(0.06 * SR)
    for n in range(length):
        t = n / SR
        env = math.exp(-t * 55.0) * min(1.0, t / 0.003)
        add(fx_g, i0 + n, math.sin(2.0 * math.pi * freq * t) * env * 0.22)


def whoosh_at(peak, dur=0.42, gain=0.28):
    start = peak - dur * 0.82
    i0 = int(start * SR)
    length = int(dur * SR)
    prev = 0.0
    for n in range(length):
        t = n / length
        white = rng.uniform(-1.0, 1.0)
        # rising brightness
        coef = 0.82 - 0.55 * t
        prev = prev * coef + white * (1.0 - coef)
        hp = white - prev
        env = math.sin(math.pi * t) ** 1.4
        add(fx_g, i0 + n, hp * env * gain)


def stab_at(t0, root):
    i0 = int(t0 * SR)
    length = int(0.35 * SR)
    ratios = (1.0, 1.25, 1.5)
    for n in range(length):
        t = n / SR
        env = math.exp(-t * 7.5) * min(1.0, t / 0.006)
        tone = 0.0
        for r in ratios:
            tone += math.sin(2.0 * math.pi * root * r * t)
        add(fx_g, i0 + n, tone / 3.0 * env * 0.2)


def riser(t0, t1):
    i0 = int(t0 * SR)
    i1 = int(t1 * SR)
    prev = 0.0
    span = max(1, i1 - i0)
    for n in range(span):
        p = n / span
        white = rng.uniform(-1.0, 1.0)
        coef = 0.9 - 0.62 * p
        prev = prev * coef + white * (1.0 - coef)
        hp = white - prev
        env = p ** 1.7 * 0.16
        add(fx_g, i0 + n, hp * env)


def main():
    beats = int(DUR / BEAT)  # 32
    # Pitch by bar (8 bars): Am, Am, C, C, D, E, Am, Am
    roots = [55.0, 55.0, 65.41, 65.41, 73.42, 82.41, 55.0, 55.0]
    for b in range(beats):
        t = b * BEAT
        kick_at(t)
        if b % 4 in (1, 3):
            clap_at(t)
        hat_at(t)
        hat_at(t + BEAT * 0.5, open_hat=(b % 4 == 3))
        bar = b // 4
        if b % 2 == 0:
            dur = 0.7 if bar >= 6 and b % 4 == 0 else 0.36
            gain = 0.26 if bar >= 6 else 0.34
            bass_at(t, roots[bar], dur=dur, gain=gain)

    # Section hits land on bars 3, 5, and 7 (3.75s, 7.50s, 11.25s).
    # Peaks sit on the zoom, the color-block cover, and the yellow dip.
    for peak, root in ((3.75, 65.41), (6.95, 73.42), (11.25, 55.0)):
        whoosh_at(peak)
        stab_at(peak, root * 2.0)
        if peak > 7:
            kick_at(peak)

    # Word accents, kept quieter than the drums.
    for t, f in (
        (0.20, 740.0),
        (0.94, 880.0),
        (1.41, 1180.0),
        (4.69, 220.0),
        (8.44, 990.0),
        (11.40, 660.0),
    ):
        tick_at(t, f)

    riser(7.55, 11.20)

    left = [0.0] * N
    right = [0.0] * N
    for i in range(N):
        duck = 1.0 - 0.62 * kick_env[i]
        bass = bass_g[i] * duck
        mid = kick_g[i] * 0.9 + clap_g[i] * 0.55 + bass + fx_g[i]
        hat = hat_g[i]
        # Hats a touch wide; clap already has a delay baked into the mono bus.
        left[i] = mid + hat * 0.85
        right[i] = mid * 0.98 + hat * 1.05

    # End fade with the picture. Front click guard.
    fade_from = int(14.40 * SR)
    for i in range(N):
        g = 1.0
        if i < 120:
            g = i / 120.0
        if i >= fade_from:
            g *= max(0.0, 1.0 - (i - fade_from) / (N - fade_from))
        left[i] *= g
        right[i] *= g

    peak = max(max(abs(v) for v in left), max(abs(v) for v in right), 1e-6)
    scale = 0.72 / peak
    raw = "audio/score-raw.wav"
    path = "audio/score.wav"
    with wave.open(raw, "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        frames = bytearray()
        for i in range(N):
            l = math.tanh(left[i] * scale * 1.15)
            r = math.tanh(right[i] * scale * 1.15)
            frames += struct.pack("<hh", int(l * 32767), int(r * 32767))
        wf.writeframes(frames)
    # Land near -14 LUFS with true peak at or under -1.5 dBTP.
    measured = subprocess.run(
        [
            "ffmpeg", "-y", "-i", raw,
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
            "-f", "null", "-",
        ],
        check=True, capture_output=True, text=True,
    )
    blob = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", measured.stderr, re.S)
    stats = json.loads(blob.group(0))
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", raw,
            "-af",
            "loudnorm=I=-14:TP=-1.5:LRA=11:"
            f"measured_I={stats['input_i']}:"
            f"measured_TP={stats['input_tp']}:"
            f"measured_LRA={stats['input_lra']}:"
            f"measured_thresh={stats['input_thresh']}:"
            f"offset={stats['target_offset']}:linear=true,"
            "alimiter=limit=0.80:attack=5:release=40:level=disabled",
            "-ar", "48000",
            path,
        ],
        check=True, capture_output=True,
    )
    os.remove(raw)
    print(f"wrote {path} peak_in={peak:.3f} measured_I={stats['input_i']}")


if __name__ == "__main__":
    main()
