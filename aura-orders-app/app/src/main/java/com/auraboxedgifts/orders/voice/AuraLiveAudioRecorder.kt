package com.auraboxedgifts.orders.voice

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import kotlin.math.sqrt

class AuraLiveAudioRecorder(
    private val onPcmChunk: (ByteArray) -> Unit,
    private val onLevel: (Float) -> Unit
) {
    private var audioRecord: AudioRecord? = null
    @Volatile
    private var running = false

    fun start(): Boolean {
        if (running) return true
        val sampleRate = 16_000
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val encoding = AudioFormat.ENCODING_PCM_16BIT
        val minBuffer = AudioRecord.getMinBufferSize(sampleRate, channelConfig, encoding)
        if (minBuffer <= 0) return false

        val record = AudioRecord(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            sampleRate,
            channelConfig,
            encoding,
            minBuffer * 2
        )
        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release()
            return false
        }
        audioRecord = record
        running = true
        record.startRecording()

        Thread({
            val buffer = ByteArray(minBuffer)
            while (running) {
                val read = record.read(buffer, 0, buffer.size)
                if (read > 0) {
                    onPcmChunk(buffer.copyOf(read))
                    onLevel(computeLevel(buffer, read))
                }
            }
        }, "AuraLiveMic").start()
        return true
    }

    fun stop() {
        running = false
        audioRecord?.let { record ->
            try {
                record.stop()
            } catch (_: Exception) {
            }
            record.release()
        }
        audioRecord = null
    }

    private fun computeLevel(buffer: ByteArray, length: Int): Float {
        if (length < 2) return 0f
        var sum = 0.0
        var i = 0
        while (i + 1 < length) {
            val sample = (buffer[i + 1].toInt() shl 8) or (buffer[i].toInt() and 0xff)
            val normalized = sample / 32768.0
            sum += normalized * normalized
            i += 2
        }
        val rms = sqrt(sum / (length / 2)).toFloat()
        return rms.coerceIn(0f, 1f)
    }

    fun encodeBase64(pcm: ByteArray): String =
        Base64.encodeToString(pcm, Base64.NO_WRAP)
}
