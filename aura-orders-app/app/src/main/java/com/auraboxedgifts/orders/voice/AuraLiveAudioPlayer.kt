package com.auraboxedgifts.orders.voice

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Base64
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

class AuraLiveAudioPlayer {
    private val sampleRate = 24_000
    private var audioTrack: AudioTrack? = null
    private val queue = ConcurrentLinkedQueue<ByteArray>()
    private val released = AtomicBoolean(false)
    private var worker: Thread? = null
    @Volatile
    private var playbackSessionId: Int = AudioManager.AUDIO_SESSION_ID_GENERATE

    fun setPlaybackSessionId(sessionId: Int) {
        if (sessionId == AudioManager.AUDIO_SESSION_ID_GENERATE) return
        if (sessionId == playbackSessionId && audioTrack != null) return
        playbackSessionId = sessionId
        restartTrack()
    }

    fun startPlayback() {
        released.set(false)
        if (worker?.isAlive == true) {
            ensureTrack()
            return
        }
        ensureTrack()
        worker = Thread({ playbackLoop() }, "AuraLivePlayback").also { it.start() }
    }

    fun enqueueBase64Pcm(base64: String) {
        if (released.get()) return
        val bytes = Base64.decode(base64, Base64.NO_WRAP)
        if (bytes.isEmpty()) return
        queue.add(bytes)
        ensureTrack()
    }

    /** Clear pending audio (interruption) but keep playback alive for the next turn. */
    fun stopAll() {
        queue.clear()
    }

    fun release() {
        released.set(true)
        queue.clear()
        worker?.interrupt()
        worker = null
        audioTrack?.let { track ->
            try {
                track.stop()
                track.release()
            } catch (_: Exception) {
            }
        }
        audioTrack = null
        playbackSessionId = AudioManager.AUDIO_SESSION_ID_GENERATE
    }

    private fun playbackLoop() {
        while (!released.get()) {
            val chunk = queue.poll()
            if (chunk == null) {
                try {
                    Thread.sleep(10)
                } catch (_: InterruptedException) {
                    if (released.get()) return
                }
                continue
            }
            val track = ensureTrack()
            var offset = 0
            while (offset < chunk.size && !released.get()) {
                val written = track.write(chunk, offset, chunk.size - offset)
                if (written <= 0) break
                offset += written
            }
        }
    }

    private fun restartTrack() {
        audioTrack?.let { track ->
            try {
                track.stop()
                track.release()
            } catch (_: Exception) {
            }
        }
        audioTrack = null
        if (!released.get()) ensureTrack()
    }

    private fun ensureTrack(): AudioTrack {
        audioTrack?.let { track ->
            if (track.playState != AudioTrack.PLAYSTATE_PLAYING) {
                try {
                    track.play()
                } catch (_: Exception) {
                }
            }
            return track
        }
        val minBuffer = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        ).coerceAtLeast(4096)
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
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
            .setSessionId(playbackSessionId)
            .build()
        track.play()
        audioTrack = track
        return track
    }
}
