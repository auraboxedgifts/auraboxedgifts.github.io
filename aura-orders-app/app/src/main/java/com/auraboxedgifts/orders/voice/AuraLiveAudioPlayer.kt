package com.auraboxedgifts.orders.voice

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Base64
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

class AuraLiveAudioPlayer {
    private val sampleRate = 24_000
    private var audioTrack: AudioTrack? = null
    private val queue = ConcurrentLinkedQueue<ByteArray>()
    private val playing = AtomicBoolean(false)
    private var worker: Thread? = null

    fun enqueueBase64Pcm(base64: String) {
        val bytes = Base64.decode(base64, Base64.NO_WRAP)
        if (bytes.isEmpty()) return
        queue.add(bytes)
        if (playing.compareAndSet(false, true)) {
            worker = Thread({ drainQueue() }, "AuraLivePlayback").also { it.start() }
        }
    }

    fun stopAll() {
        queue.clear()
        playing.set(false)
        audioTrack?.let { track ->
            try {
                track.pause()
                track.flush()
            } catch (_: Exception) {
            }
        }
    }

    fun release() {
        stopAll()
        audioTrack?.release()
        audioTrack = null
        worker = null
    }

    private fun drainQueue() {
        val track = ensureTrack()
        while (playing.get()) {
            val chunk = queue.poll()
            if (chunk == null) {
                if (queue.isEmpty()) {
                    playing.set(false)
                    return
                }
                Thread.sleep(5)
                continue
            }
            var offset = 0
            while (offset < chunk.size && playing.get()) {
                val written = track.write(chunk, offset, chunk.size - offset)
                if (written <= 0) break
                offset += written
            }
        }
    }

    private fun ensureTrack(): AudioTrack {
        audioTrack?.let { return it }
        val minBuffer = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(sampleRate)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(minBuffer * 2)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        track.play()
        audioTrack = track
        return track
    }
}
