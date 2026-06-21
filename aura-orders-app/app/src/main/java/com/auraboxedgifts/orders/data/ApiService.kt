package com.auraboxedgifts.orders.data

import com.auraboxedgifts.orders.BuildConfig
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import java.io.File
import java.util.concurrent.TimeUnit

interface AuraApiService {
    @POST("/api/admin/login")
    suspend fun adminLogin(@Body body: LoginRequest): Response<ApiResponse<LoginData>>

    @GET("/api/admin/orders")
    suspend fun getOrders(@Header("Authorization") auth: String): Response<ApiResponse<List<Order>>>

    @GET("/api/admin/orders/{id}")
    suspend fun getOrder(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): Response<ApiResponse<Order>>

    @PATCH("/api/admin/orders/{id}")
    suspend fun updateOrder(
        @Header("Authorization") auth: String,
        @Path("id") id: String,
        @Body body: UpdateOrderRequest
    ): Response<ApiResponse<Order>>

    @GET("/api/products")
    suspend fun getProducts(): Response<ApiResponse<List<Product>>>

    @GET("/api/collections")
    suspend fun getCollections(): Response<ApiResponse<List<Collection>>>

    @GET("/api/hampers")
    suspend fun getHampers(): Response<ApiResponse<List<Hamper>>>

    @POST("/api/admin/products")
    suspend fun createProduct(
        @Header("Authorization") auth: String,
        @Body body: ProductPayload
    ): Response<ApiResponse<Product>>

    @PUT("/api/admin/products/{id}")
    suspend fun updateProduct(
        @Header("Authorization") auth: String,
        @Path("id") id: String,
        @Body body: ProductPayload
    ): Response<ApiResponse<Product>>

    @DELETE("/api/admin/products/{id}")
    suspend fun deleteProduct(
        @Header("Authorization") auth: String,
        @Path("id") id: String
    ): Response<ApiResponse<DeleteResult>>

    @Multipart
    @POST("/api/admin/upload")
    suspend fun uploadImage(
        @Header("Authorization") auth: String,
        @Part image: MultipartBody.Part
    ): Response<ApiResponse<UploadResult>>

    @POST("/api/auth/login")
    suspend fun customerLogin(@Body body: LoginRequest): Response<AuthTokenResponse>

    @POST("/api/auth/send-otp")
    suspend fun sendOtp(@Body body: OtpRequest): Response<AuthTokenResponse>

    @POST("/api/auth/verify-otp")
    suspend fun verifyOtp(@Body body: VerifyOtpRequest): Response<AuthTokenResponse>

    @POST("/api/auth/set-password")
    suspend fun setPassword(
        @Header("Authorization") auth: String,
        @Body body: SetPasswordRequest
    ): Response<AuthTokenResponse>

    @POST("/api/auth/reset-password")
    suspend fun resetPassword(
        @Body body: ResetPasswordRequest
    ): Response<AuthTokenResponse>

    @GET("/api/auth/me")
    suspend fun getMe(@Header("Authorization") auth: String): Response<ApiResponse<UserProfile>>

    @GET("/api/orders")
    suspend fun getCustomerOrders(@Header("Authorization") auth: String): Response<ApiResponse<List<Order>>>

    @GET("/api/config")
    suspend fun getConfig(): Response<ApiResponse<AppConfig>>

    @POST("/api/cart/calculate")
    suspend fun calculateCart(@Body body: CartCalculateRequest): Response<ApiResponse<Cart>>

    @GET("/api/settings")
    suspend fun getSettings(): Response<ApiResponse<StoreSettings>>

    @PUT("/api/admin/settings")
    suspend fun updateSettings(
        @Header("Authorization") auth: String,
        @Body body: ShippingSettingsRequest
    ): Response<ApiResponse<StoreSettings>>

    @GET("/api/auth/checkout-info")
    suspend fun getCheckoutInfo(@Header("Authorization") auth: String): Response<ApiResponse<CheckoutInfo>>

    @GET("/api/mobile-ai/status")
    suspend fun mobileAiStatus(): Response<ApiResponse<Map<String, Any>>>

    @POST("/api/mobile-ai/chat")
    suspend fun mobileAiChat(@Body body: Map<String, @JvmSuppressWildcards Any?>): Response<ApiResponse<MobileAiChatResult>>

    @POST("/api/fcm/register")
    suspend fun registerFcm(@Header("Authorization") auth: String?, @Body body: FcmRegisterRequest): Response<ApiResponse<Map<String, Boolean>>>

    @POST("/api/create-order")
    suspend fun createPaymentOrder(@Body body: CreatePaymentRequest): Response<CreateOrderResponse>

    @POST("/api/verify-payment")
    suspend fun verifyPayment(@Body body: VerifyPaymentRequest): Response<ApiResponse<VerifyPaymentData>>

    @POST("/api/fcm/cart-reminder")
    suspend fun cartReminder(
        @Header("Authorization") auth: String,
        @Body body: Map<String, @JvmSuppressWildcards Number>
    ): Response<ApiResponse<Map<String, Any>>>
}

class AuraRepository(private val api: AuraApiService) {

    private fun bearer(token: String) = "Bearer $token"

    suspend fun login(email: String, password: String): LoginData {
        val response = api.adminLogin(LoginRequest(email.trim().lowercase(), password))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Login failed")
        }
        return body.data ?: throw ApiException("No token returned")
    }

    suspend fun customerLogin(email: String, password: String): Pair<String, UserProfile?> {
        val response = api.customerLogin(LoginRequest(email.trim().lowercase(), password))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true || body.token.isNullOrBlank()) {
            throw ApiException(body?.error ?: "Login failed")
        }
        return body.token to body.user
    }

    suspend fun sendOtp(email: String, signUp: Boolean = false) {
        val response = api.sendOtp(OtpRequest(email.trim().lowercase(), signUp))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: body?.message ?: "Could not send OTP")
        }
    }

    suspend fun verifyOtp(email: String, otp: String): Pair<String, UserProfile?> {
        val response = api.verifyOtp(VerifyOtpRequest(email.trim().lowercase(), otp.trim()))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true || body.token.isNullOrBlank()) {
            throw ApiException(body?.error ?: "Invalid OTP")
        }
        return body.token to body.user
    }

    suspend fun setPassword(token: String, password: String, name: String?): UserProfile? {
        val response = api.setPassword(bearer(token), SetPasswordRequest(password, name))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not set password")
        }
        return body.user
    }

    suspend fun resetPassword(email: String, otp: String, newPassword: String): Pair<String, UserProfile?> {
        val response = api.resetPassword(ResetPasswordRequest(email.trim().lowercase(), otp.trim(), newPassword))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true || body.token.isNullOrBlank()) {
            throw ApiException(body?.error ?: "Could not reset password")
        }
        return body.token to body.user
    }

    suspend fun fetchCustomerOrders(token: String): List<Order> {
        val response = api.getCustomerOrders(bearer(token))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not load orders")
        }
        return body.data ?: emptyList()
    }

    suspend fun fetchOrders(token: String): List<Order> {
        val response = api.getOrders(bearer(token))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not load orders")
        }
        return body.data ?: emptyList()
    }

    suspend fun fetchOrder(token: String, id: String): Order {
        val response = api.getOrder(bearer(token), id)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Order not found")
        }
        return body.data ?: throw ApiException("Order not found")
    }

    suspend fun updateOrderStatus(token: String, id: String, status: String): Order {
        val response = api.updateOrder(bearer(token), id, UpdateOrderRequest(status = status))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not update order")
        }
        return body.data ?: throw ApiException("Update failed")
    }

    suspend fun fetchProducts(): List<Product> {
        val response = api.getProducts()
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not load products")
        }
        return body.data ?: emptyList()
    }

    suspend fun fetchCollections(): List<Collection> {
        val response = api.getCollections()
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not load collections")
        }
        return body.data ?: emptyList()
    }

    suspend fun fetchHampers(): List<Hamper> {
        val response = api.getHampers()
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            return emptyList()
        }
        return body.data?.filter { it.price > 0 } ?: emptyList()
    }

    suspend fun createProduct(token: String, payload: ProductPayload): Product {
        val response = api.createProduct(bearer(token), payload)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not create product")
        }
        return body.data ?: throw ApiException("Create failed")
    }

    suspend fun updateProduct(token: String, id: String, payload: ProductPayload): Product {
        val response = api.updateProduct(bearer(token), id, payload)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not update product")
        }
        return body.data ?: throw ApiException("Update failed")
    }

    suspend fun deleteProduct(token: String, id: String) {
        val response = api.deleteProduct(bearer(token), id)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not delete product")
        }
    }

    suspend fun uploadImage(token: String, file: File, mimeType: String): UploadResult {
        val requestBody = file.asRequestBody(mimeType.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("image", file.name, requestBody)
        val response = api.uploadImage(bearer(token), part)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Upload failed")
        }
        return body.data ?: throw ApiException("Upload failed")
    }

    suspend fun fetchConfig(): AppConfig {
        val response = api.getConfig()
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) return AppConfig()
        return body.data ?: AppConfig()
    }

    suspend fun calculateCart(items: List<LocalCartItem>): Cart {
        val response = api.calculateCart(CartCalculateRequest(items))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not calculate cart")
        }
        return body.data ?: Cart()
    }

    suspend fun createPaymentOrder(items: List<LocalCartItem>, amount: Double): Pair<RazorpayOrderInfo, String> {
        val response = api.createPaymentOrder(CreatePaymentRequest(items = items, amount = amount))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true || body.order == null || body.key_id.isNullOrBlank()) {
            val err = body?.error ?: response.errorBody()?.string()?.take(200) ?: "Could not create payment order (HTTP ${response.code()})"
            throw ApiException(err)
        }
        return body.order to body.key_id
    }

    suspend fun fetchSettings(): StoreSettings {
        val response = api.getSettings()
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            return StoreSettings()
        }
        return body.data ?: StoreSettings()
    }

    suspend fun updateShippingRate(token: String, rate: Double): StoreSettings {
        val response = api.updateSettings(bearer(token), ShippingSettingsRequest(rate))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Could not save shipping rate")
        }
        return body.data ?: StoreSettings(shippingFlatRate = rate)
    }

    suspend fun fetchCheckoutInfo(token: String): CheckoutInfo? {
        val response = api.getCheckoutInfo(bearer(token))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) return null
        return body.data
    }

    suspend fun mobileAiChat(
        message: String,
        history: List<Map<String, String>>,
        cartContext: MobileAiCartContext?,
        screen: String
    ): MobileAiChatResult {
        val payload = mutableMapOf<String, Any?>(
            "message" to message,
            "history" to history,
            "screen" to screen
        )
        if (cartContext != null) payload["cartContext"] = cartContext
        val response = api.mobileAiChat(payload)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true || body.data == null) {
            throw ApiException(body?.error ?: "Aura AI request failed")
        }
        return body.data
    }

    suspend fun registerFcmToken(token: String?, role: String, email: String?, fcmToken: String) {
        val response = api.registerFcm(token?.let { bearer(it) }, FcmRegisterRequest(fcmToken, role, email))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "FCM registration failed")
        }
    }

    suspend fun verifyPayment(request: VerifyPaymentRequest): Order {
        val response = api.verifyPayment(request)
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            val errBody = response.errorBody()?.string()?.take(300)
            throw ApiException(body?.error ?: errBody ?: "Payment verification failed (HTTP ${response.code()})")
        }
        body.data?.order?.let { return it }
        throw ApiException(body?.error ?: "Payment verification failed")
    }

    suspend fun requestCartReminder(token: String, itemCount: Int) {
        val response = api.cartReminder(bearer(token), mapOf("itemCount" to itemCount))
        val body = response.body()
        if (!response.isSuccessful || body?.success != true) {
            throw ApiException(body?.error ?: "Cart reminder failed")
        }
    }
}

class ApiException(message: String) : Exception(message)

object ApiClient {
    fun create(): AuraApiService {
        val clientBuilder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
        if (BuildConfig.DEBUG) {
            clientBuilder.addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BASIC
                }
            )
        }
        val client = clientBuilder.build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AuraApiService::class.java)
    }
}
