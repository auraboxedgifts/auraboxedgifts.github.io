package com.auraboxedgifts.orders.voice

import android.util.Base64
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

class AuraLiveVoiceClient(
    private val wsUrl: String,
    private val listener: Listener
) {
    interface Listener {
        fun onStatus(status: String, connected: Boolean = false)
        fun onError(message: String)
        fun onAudioChunk(base64Pcm: String)
        fun onInterrupted()
        fun onTurnComplete()
        fun onMobileAction(action: JsonObject)
        fun onCalculateCartTotal(requestId: String)
    }

    private val gson = Gson()
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()
    private var webSocket: WebSocket? = null

    fun connect() {
        disconnect()
        val request = Request.Builder().url(wsUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                listener.onStatus("Connecting to Aura AI…")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                listener.onError(t.message ?: "Connection failed")
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                listener.onStatus("Disconnected", connected = false)
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "Session ended")
        webSocket = null
    }

    fun sendAudio(base64Pcm: String) {
        webSocket?.send(gson.toJson(mapOf("type" to "audio", "data" to base64Pcm)))
    }

    fun sendCartTotalsResponse(requestId: String, itemsJson: String, cartJson: String) {
        webSocket?.send(
            """{"type":"cart_totals_response","requestId":"$requestId","items":$itemsJson,"cart":$cartJson}"""
        )
    }

    private fun handleMessage(raw: String) {
        val json = try {
            JsonParser.parseString(raw).asJsonObject
        } catch (_: Exception) {
            return
        }
        when (json.get("type")?.asString) {
            "status" -> {
                val status = json.get("status")?.asString.orEmpty()
                when (status) {
                    "connecting" -> listener.onStatus("Connecting to Aura AI…")
                    "connected" -> listener.onStatus("Ready", connected = true)
                    "disconnected" -> listener.onStatus("Disconnected", connected = false)
                }
            }
            "error" -> listener.onError(json.get("error")?.asString ?: "Aura AI error")
            "gemini_message" -> {
                val data = json.getAsJsonObject("data") ?: return
                if (data.has("data")) {
                    listener.onAudioChunk(data.get("data").asString)
                }
                val serverContent = data.getAsJsonObject("serverContent")
                if (serverContent != null) {
                    if (serverContent.get("interrupted")?.asBoolean == true) {
                        listener.onInterrupted()
                    }
                    if (serverContent.get("turnComplete")?.asBoolean == true) {
                        listener.onTurnComplete()
                    }
                }
            }
            "mobile_action" -> {
                json.getAsJsonObject("action")?.let { listener.onMobileAction(it) }
            }
            "calculate_cart_total" -> {
                val requestId = json.get("requestId")?.asString ?: return
                listener.onCalculateCartTotal(requestId)
            }
        }
    }
}
